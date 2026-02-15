import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from app.models import db, EnergyLog
import pickle
import os

class EnergyPredictor:
    """ML-based energy consumption predictor"""
    
    def __init__(self):
        self.model = None
        self.model_path = 'app/prediction/energy_model.pkl'
        self.is_trained = False
        
    def prepare_training_data(self, hours_back=168):
        """
        Prepare training data from historical logs
        hours_back: default 168 (7 days of data)
        """
        cutoff_time = datetime.now() - timedelta(hours=hours_back)
        
        # Fetch historical logs
        logs = EnergyLog.query.filter(
            EnergyLog.timestamp >= cutoff_time
        ).order_by(EnergyLog.timestamp).all()
        
        if len(logs) < 100:
            return None, "Insufficient data for training (need at least 100 records)"
        
        # Convert to DataFrame
        data = []
        for log in logs:
            data.append({
                'timestamp': log.timestamp,
                'room_id': log.room_id,
                'occupancy': int(log.occupancy),
                'temperature': log.temperature,
                'total_load': log.total_load,
                'optimized': int(log.optimized)
            })
        
        df = pd.DataFrame(data)
        
        # Extract time features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Aggregate by timestamp (campus-wide load per time point)
        campus_df = df.groupby('timestamp').agg({
            'total_load': 'sum',
            'occupancy': 'mean',
            'temperature': 'mean',
            'hour': 'first',
            'day_of_week': 'first',
            'is_weekend': 'first'
        }).reset_index()
        
        campus_df.columns = ['timestamp', 'campus_load', 'occupancy_rate', 
                             'avg_temperature', 'hour', 'day_of_week', 'is_weekend']
        
        # Create lag feature (previous hour load)
        campus_df['last_hour_load'] = campus_df['campus_load'].shift(1)
        
        # Drop rows with NaN (first row after shift)
        campus_df = campus_df.dropna()
        
        if len(campus_df) < 50:
            return None, "Insufficient aggregated data for training"
        
        return campus_df, None
    
    def train_model(self, hours_back=168):
        """Train RandomForest model on historical data"""
        
        print("Starting ML model training...")
        
        # Prepare data
        df, error = self.prepare_training_data(hours_back)
        
        if error:
            print(f"Training failed: {error}")
            return False, error
        
        print(f"Prepared {len(df)} training samples")
        
        # Features and target
        feature_columns = ['hour', 'day_of_week', 'is_weekend', 
                          'avg_temperature', 'occupancy_rate', 'last_hour_load']
        
        X = df[feature_columns]
        y = df['campus_load']
        
        # Train-test split
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Train RandomForest
        self.model = RandomForestRegressor(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        
        print("Training RandomForest model...")
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, y_pred)
        r2 = r2_score(y_test, y_pred)
        
        print(f" Model trained successfully!")
        print(f" Mean Absolute Error: {mae:.2f} kW")
        print(f" R² Score: {r2:.4f}")
        
        # Save model
        self.save_model()
        self.is_trained = True
        
        return True, {
            'mae': round(mae, 2),
            'r2_score': round(r2, 4),
            'training_samples': len(X_train),
            'test_samples': len(X_test)
        }
    
    def save_model(self):
        """Save trained model to disk"""
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
        print(f" Model saved to {self.model_path}")
    
    def load_model(self):
        """Load trained model from disk"""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
            self.is_trained = True
            print(f" Model loaded from {self.model_path}")
            return True
        return False
    
    def predict_next_hour(self):
        """Predict campus load for the next hour"""
        
        if not self.is_trained:
            if not self.load_model():
                return None, "Model not trained. Please train the model first."
        
        # Get latest data for features
        latest_timestamp = db.session.query(db.func.max(EnergyLog.timestamp)).scalar()
        
        if not latest_timestamp:
            return None, "No data available for prediction"
        
        # Get current campus state
        latest_logs = EnergyLog.query.filter(
            EnergyLog.timestamp == latest_timestamp
        ).all()
        
        if not latest_logs:
            return None, "No logs found for latest timestamp"
        
        # Calculate current features
        total_load = sum(log.total_load for log in latest_logs)
        avg_temp = np.mean([log.temperature for log in latest_logs])
        occupancy_rate = sum(log.occupancy for log in latest_logs) / len(latest_logs)
        
        # Next hour features
        next_hour_time = latest_timestamp + timedelta(hours=1)
        hour = next_hour_time.hour
        day_of_week = next_hour_time.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        
        # Create feature vector
        features = pd.DataFrame([{
            'hour': hour,
            'day_of_week': day_of_week,
            'is_weekend': is_weekend,
            'avg_temperature': avg_temp,
            'occupancy_rate': occupancy_rate,
            'last_hour_load': total_load
        }])
        
        # Predict
        predicted_load = self.model.predict(features)[0]
        
        # Calculate confidence interval (using model's estimators)
        predictions = np.array([tree.predict(features)[0] for tree in self.model.estimators_])
        std_dev = np.std(predictions)
        
        result = {
            'predicted_load_kw': round(predicted_load, 2),
            'prediction_for': next_hour_time.isoformat(),
            'current_load_kw': round(total_load, 2),
            'current_timestamp': latest_timestamp.isoformat(),
            'confidence_interval': {
                'lower': round(predicted_load - 1.96 * std_dev, 2),
                'upper': round(predicted_load + 1.96 * std_dev, 2)
            },
            'features_used': {
                'hour': hour,
                'day_of_week': day_of_week,
                'is_weekend': bool(is_weekend),
                'avg_temperature': round(avg_temp, 2),
                'occupancy_rate': round(occupancy_rate, 2),
                'last_hour_load': round(total_load, 2)
            }
        }
        
        return result, None
    
    def get_feature_importance(self):
        """Get feature importance from trained model"""
        if not self.is_trained:
            if not self.load_model():
                return None, "Model not trained"
        
        feature_names = ['hour', 'day_of_week', 'is_weekend', 
                        'avg_temperature', 'occupancy_rate', 'last_hour_load']
        
        importances = self.model.feature_importances_
        
        feature_importance = [
            {
                'feature': name,
                'importance': round(imp, 4)
            }
            for name, imp in zip(feature_names, importances)
        ]
        
        # Sort by importance
        feature_importance.sort(key=lambda x: x['importance'], reverse=True)
        
        return feature_importance, None