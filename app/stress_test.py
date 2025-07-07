# Create this as: app/stress_test.py

import asyncio
import httpx
import time
import psutil
import json
from datetime import datetime
import sys

class LoadAuditStressTester:
    def __init__(self, base_url="http://localhost:8000"):
        self.base_url = base_url
        self.results = []
        
    async def run_stress_test(self):
        """Run progressive stress tests"""
        print("🚀 LoadAudit Stress Testing Suite")
        print("=" * 50)
        
        # Test progression: gradually increase load
        test_scenarios = [
            {"users": 5, "duration": 10, "name": "Baseline"},
            {"users": 10, "duration": 15, "name": "Light Load"},
            {"users": 25, "duration": 20, "name": "Moderate Load"},
            {"users": 50, "duration": 30, "name": "Heavy Load"},
            {"users": 100, "duration": 30, "name": "Stress Test"},
            {"users": 200, "duration": 30, "name": "Breaking Point Test"},
            {"users": 500, "duration": 30, "name": "System Limit Test"},
        ]
        
        for scenario in test_scenarios:
            print(f"\n📊 Running {scenario['name']}: {scenario['users']} users for {scenario['duration']}s")
            
            # Check system health before test
            cpu_before = psutil.cpu_percent()
            memory_before = psutil.virtual_memory().percent
            
            if cpu_before > 80 or memory_before > 80:
                print(f"⚠️ System already stressed (CPU: {cpu_before}%, Memory: {memory_before}%)")
                print("Stopping stress tests for safety")
                break
                
            try:
                result = await self.run_single_test(
                    users=scenario["users"],
                    duration=scenario["duration"],
                    target_url="https://httpbin.org/delay/1"
                )
                
                self.results.append({
                    "scenario": scenario["name"],
                    "config": scenario,
                    "result": result,
                    "timestamp": datetime.now().isoformat()
                })
                
                # Check if we should continue
                if result.get("status") == "FAILED":
                    print(f"❌ Test failed at {scenario['users']} users")
                    break
                    
                if result.get("system_stress", False):
                    print(f"⚠️ System stress detected at {scenario['users']} users")
                    break
                    
                # Wait between tests
                print("💤 Waiting 10 seconds before next test...")
                await asyncio.sleep(10)
                
            except Exception as e:
                print(f"❌ Critical error during {scenario['name']}: {e}")
                break
        
        # Generate report
        self.generate_report()
        
    async def run_single_test(self, users, duration, target_url):
        """Run a single load test via API"""
        
        test_config = {
            "target_url": target_url,
            "num_users": users,
            "duration": duration,
            "method": "GET",
            "headers": {},
            "payload": {},
            "chaos_mode": False
        }
        
        start_time = time.time()
        cpu_before = psutil.cpu_percent()
        memory_before = psutil.virtual_memory().percent
        
        try:
            async with httpx.AsyncClient(timeout=duration + 30) as client:
                response = await client.post(
                    f"{self.base_url}/start",
                    json=test_config
                )
                
                if response.status_code == 200:
                    result_data = response.json()
                    end_time = time.time()
                    
                    cpu_after = psutil.cpu_percent()
                    memory_after = psutil.virtual_memory().percent
                    
                    return {
                        "status": "SUCCESS",
                        "test_duration": end_time - start_time,
                        "api_response": result_data,
                        "system_impact": {
                            "cpu_before": cpu_before,
                            "cpu_after": cpu_after,
                            "cpu_increase": cpu_after - cpu_before,
                            "memory_before": memory_before,
                            "memory_after": memory_after,
                            "memory_increase": memory_after - memory_before
                        },
                        "system_stress": cpu_after > 80 or memory_after > 80
                    }
                else:
                    return {
                        "status": "FAILED",
                        "error": f"HTTP {response.status_code}",
                        "response": response.text
                    }
                    
        except Exception as e:
            return {
                "status": "FAILED", 
                "error": str(e),
                "test_duration": time.time() - start_time
            }
    
    def generate_report(self):
        """Generate a comprehensive stress test report"""
        print("\n" + "="*60)
        print("📋 LOADAUDIT STRESS TEST REPORT")
        print("="*60)
        
        successful_tests = [r for r in self.results if r["result"]["status"] == "SUCCESS"]
        failed_tests = [r for r in self.results if r["result"]["status"] == "FAILED"]
        
        if successful_tests:
            max_users = max(r["config"]["users"] for r in successful_tests)
            print(f"✅ Maximum Concurrent Users Handled: {max_users}")
            
            # Find performance breaking point
            performance_degradation = []
            for result in successful_tests:
                api_data = result["result"].get("api_response", {})
                if api_data.get("avg_latency", 0) > 2.0:  # 2 second threshold
                    performance_degradation.append(result["config"]["users"])
            
            if performance_degradation:
                print(f"⚠️ Performance Degradation Starts At: {min(performance_degradation)} users")
            
            # System resource usage
            max_cpu = max(r["result"]["system_impact"]["cpu_after"] for r in successful_tests)
            max_memory = max(r["result"]["system_impact"]["memory_after"] for r in successful_tests)
            print(f"🖥️ Peak CPU Usage: {max_cpu:.1f}%")
            print(f"💾 Peak Memory Usage: {max_memory:.1f}%")
        
        if failed_tests:
            first_failure = failed_tests[0]
            print(f"❌ First Failure At: {first_failure['config']['users']} users")
            print(f"💥 Failure Reason: {first_failure['result']['error']}")
        
        print(f"\n📊 Total Tests Run: {len(self.results)}")
        print(f"✅ Successful: {len(successful_tests)}")
        print(f"❌ Failed: {len(failed_tests)}")
        
        # Recommendations
        print("\n🎯 RECOMMENDATIONS:")
        if successful_tests:
            safe_limit = max_users // 2
            print(f"• Recommended Production Limit: {safe_limit} concurrent users")
            print(f"• Safe Operating Zone: 1-{safe_limit} users")
            print(f"• Monitor Closely Above: {safe_limit} users")
            print(f"• Hard Limit: {max_users} users")
        
        # Save detailed report
        report_file = f"stress_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\n💾 Detailed report saved to: {report_file}")

async def main():
    """Run the stress test"""
    if len(sys.argv) > 1 and sys.argv[1] == "--help":
        print("LoadAudit Stress Tester")
        print("Usage: python app/stress_test.py")
        print("This will progressively test your LoadAudit system to find breaking points")
        return
    
    print("⚠️ WARNING: This will stress test your system!")
    print("Make sure you're running this on a test environment.")
    
    response = input("Continue? (y/N): ")
    if response.lower() != 'y':
        print("Stress test cancelled.")
        return
    
    tester = LoadAuditStressTester()
    await tester.run_stress_test()

if __name__ == "__main__":
    asyncio.run(main())