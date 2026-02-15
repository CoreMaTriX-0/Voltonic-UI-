"""
Test script for VOLTONIC REST API endpoints
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:5000/api"

def print_section(title):
    """Print formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def test_endpoint(name, method, endpoint, data=None, params=None):
    """Test a single endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == 'GET':
            response = requests.get(url, params=params, timeout=10)
        elif method == 'POST':
            response = requests.post(url, json=data, timeout=10)
        else:
            print(f" {name}: Unsupported method {method}")
            return False
        
        if response.status_code == 200:
            print(f" {name}")
            result = response.json()
            
            # Print summary of response
            if result.get('status') == 'success':
                data_preview = result.get('data', {})
                
                # Show sample data based on type
                if isinstance(data_preview, dict):
                    # Show first few keys
                    keys = list(data_preview.keys())[:5]
                    print(f"   Keys: {', '.join(keys)}")
                elif isinstance(data_preview, list):
                    print(f"   Items: {len(data_preview)}")
                    if data_preview:
                        print(f"   First item keys: {', '.join(list(data_preview[0].keys())[:5])}")
                
            return True
        else:
            print(f" {name}: HTTP {response.status_code}")
            try:
                error = response.json()
                print(f"   Error: {error.get('message', 'Unknown error')}")
            except:
                print(f"   Response: {response.text[:100]}")
            return False
            
    except requests.exceptions.ConnectionError:
        print(f"{name}: Connection failed (Is the server running?)")
        return False
    except Exception as e:
        print(f" {name}: {str(e)}")
        return False

def run_all_tests():
    """Run comprehensive API tests"""
    print("\n" + "="*70)
    print(" VOLTONIC API ENDPOINT TESTING")
    print("="*70)
    print(f"Testing API at: {BASE_URL}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # ========================================================================
    # HEALTH CHECK
    # ========================================================================
    print_section(" Health Check")
    results.append(test_endpoint(
        "Health Check",
        "GET",
        "/health"
    ))
    
    # ========================================================================
    # DASHBOARD & LIVE DATA
    # ========================================================================
    print_section(" Dashboard & Live Data")
    
    results.append(test_endpoint(
        "Live Dashboard",
        "GET",
        "/dashboard/live"
    ))
    
    results.append(test_endpoint(
        "Campus Live Load",
        "GET",
        "/live/campus"
    ))
    
    results.append(test_endpoint(
        "All Buildings Live Load",
        "GET",
        "/live/buildings"
    ))
    
    results.append(test_endpoint(
        "Specific Building Live Load (Building 1)",
        "GET",
        "/live/building/1"
    ))
    
    # ========================================================================
    # ANALYTICS
    # ========================================================================
    print_section(" Analytics Endpoints")
    
    results.append(test_endpoint(
        "Hourly Analytics (24h)",
        "GET",
        "/analytics/hourly",
        params={'hours': 24}
    ))
    
    results.append(test_endpoint(
        "Daily Analytics (7 days)",
        "GET",
        "/analytics/daily",
        params={'days': 7}
    ))
    
    results.append(test_endpoint(
        "Building Comparison",
        "GET",
        "/analytics/building-comparison"
    ))
    
    # ========================================================================
    # OPTIMIZATION
    # ========================================================================
    print_section(" Optimization Endpoints")
    
    results.append(test_endpoint(
        "Optimization Savings",
        "GET",
        "/optimization/savings"
    ))
    
    results.append(test_endpoint(
        "Optimization Status",
        "GET",
        "/optimization/status"
    ))
    
    # ========================================================================
    # PREDICTIONS
    # ========================================================================
    print_section(" Prediction Endpoints")
    
    results.append(test_endpoint(
        "Next Hour Prediction",
        "GET",
        "/prediction/next-hour"
    ))
    
    results.append(test_endpoint(
        "Model Information",
        "GET",
        "/prediction/model-info"
    ))
    
    # ========================================================================
    # CAMPUS STRUCTURE
    # ========================================================================
    print_section(" Campus Structure Endpoints")
    
    results.append(test_endpoint(
        "Campus Structure",
        "GET",
        "/campus/structure"
    ))
    
    results.append(test_endpoint(
        "All Faculties",
        "GET",
        "/campus/faculties"
    ))
    
    results.append(test_endpoint(
        "All Buildings",
        "GET",
        "/campus/buildings"
    ))
    
    results.append(test_endpoint(
        "All Rooms (limited)",
        "GET",
        "/campus/rooms"
    ))
    
    results.append(test_endpoint(
        "Rooms by Type (classroom)",
        "GET",
        "/campus/rooms",
        params={'type': 'classroom'}
    ))
    
    results.append(test_endpoint(
        "Room Details (Room 1)",
        "GET",
        "/campus/room/1"
    ))
    
    # ========================================================================
    # HISTORICAL DATA
    # ========================================================================
    print_section(" Historical Data Endpoints")
    
    results.append(test_endpoint(
        "Room History (Room 1, 24h)",
        "GET",
        "/history/room/1",
        params={'hours': 24}
    ))
    
    results.append(test_endpoint(
        "Campus History (24h)",
        "GET",
        "/history/campus",
        params={'hours': 24}
    ))
    
    # ========================================================================
    # STATISTICS
    # ========================================================================
    print_section("Statistics Endpoints")
    
    results.append(test_endpoint(
        "Statistics Summary",
        "GET",
        "/stats/summary"
    ))
    
    # ========================================================================
    # SUMMARY
    # ========================================================================
    print_section("Test Summary")
    
    total_tests = len(results)
    passed = sum(results)
    failed = total_tests - passed
    success_rate = (passed / total_tests) * 100 if total_tests > 0 else 0
    
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    print("\n" + "="*70)
    
    if success_rate == 100:
        print("All API endpoints working perfectly!")
    elif success_rate >= 80:
        print("Most API endpoints working correctly")
    else:
        print("Several API endpoints need attention")
    
    print("="*70 + "\n")
    
    return success_rate == 100

if __name__ == "__main__":
    run_all_tests()
