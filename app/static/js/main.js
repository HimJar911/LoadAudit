// Global state
let chaosMode = false;
let currentTest = null;
let charts = {};
let realtimeData = {
  latency: [],
  errors: [],
  users: [],
  timestamps: [],
};

// Use the same origin as the frontend (your FastAPI server)
const API_BASE = window.location.origin;

// Chart.js default config
Chart.defaults.color = "#94a3b8";
Chart.defaults.borderColor = "rgba(71, 85, 105, 0.3)";
Chart.defaults.backgroundColor = "rgba(251, 191, 36, 0.1)";

// Initialize app
document.addEventListener("DOMContentLoaded", function () {
  console.log("LoadAudit initializing...");
  console.log("API Base URL:", API_BASE);
  loadPastRuns();
  setupFormHandler();
  initializeCharts();
});

// Initialize charts
function initializeCharts() {
  console.log("Initializing charts...");

  // Latency Chart
  const latencyCtx = document.getElementById("latencyChart");
  if (latencyCtx) {
    charts.latency = new Chart(latencyCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderColor: "#fbbf24",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        elements: { point: { radius: 0 } },
      },
    });
  }

  // Error Chart
  const errorCtx = document.getElementById("errorChart");
  if (errorCtx) {
    charts.error = new Chart(errorCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false, min: 0, max: 100 },
        },
      },
    });
  }

  // Users Chart
  const usersCtx = document.getElementById("usersChart");
  if (usersCtx) {
    charts.users = new Chart(usersCtx, {
      type: "bar",
      data: {
        labels: [],
        datasets: [
          {
            data: [],
            backgroundColor: "rgba(16, 185, 129, 0.6)",
            borderColor: "#10b981",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });
  }

  // Status Chart (Pie)
  const statusCtx = document.getElementById("statusChart");
  if (statusCtx) {
    charts.status = new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: ["2xx", "4xx", "5xx"],
        datasets: [
          {
            data: [100, 0, 0],
            backgroundColor: [
              "rgba(16, 185, 129, 0.8)",
              "rgba(251, 191, 36, 0.8)",
              "rgba(239, 68, 68, 0.8)",
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    });
  }

  // Performance Chart
  const perfCtx = document.getElementById("performanceChart");
  if (perfCtx) {
    charts.performance = new Chart(perfCtx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "Response Time (ms)",
            data: [],
            borderColor: "#fbbf24",
            backgroundColor: "rgba(251, 191, 36, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            yAxisID: "y",
          },
          {
            label: "Error Rate (%)",
            data: [],
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            fill: false,
            tension: 0.4,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { color: "#cbd5e1", font: { size: 10 } },
          },
        },
        scales: {
          x: {
            display: true,
            grid: { color: "rgba(71, 85, 105, 0.3)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            grid: { color: "rgba(71, 85, 105, 0.3)" },
            ticks: { color: "#94a3b8", font: { size: 10 } },
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            grid: { drawOnChartArea: false },
            ticks: { color: "#94a3b8", font: { size: 10 } },
          },
        },
      },
    });
  }

  console.log("Charts initialized:", Object.keys(charts));
}

// Toggle chaos mode
function toggleChaos() {
  chaosMode = !chaosMode;
  const toggle = document.getElementById("chaosToggle");
  const warning = document.getElementById("chaosWarning");

  console.log("Chaos mode toggled:", chaosMode);

  if (chaosMode) {
    toggle.classList.add("active");
    warning.classList.remove("hidden");
  } else {
    toggle.classList.remove("active");
    warning.classList.add("hidden");
  }
}

// Setup form submission
function setupFormHandler() {
  document
    .getElementById("loadTestForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      console.log("Form submitted, starting load test...");

      const btn = document.getElementById("startTestBtn");
      btn.classList.add("loading");
      btn.disabled = true;

      // Show live monitoring immediately
      startLiveMonitoring();

      try {
        const formData = {
          target_url: document.getElementById("targetUrl").value,
          num_users: parseInt(document.getElementById("numUsers").value),
          duration: parseInt(document.getElementById("duration").value),
          method: document.getElementById("method").value,
          headers: parseJSON(document.getElementById("headers").value, {}),
          payload: parseJSON(document.getElementById("payload").value, {}),
          chaos_mode: chaosMode,
        };

        console.log("Sending request with data:", formData);

        const response = await fetch(`${API_BASE}/start`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Response error:", errorText);
          throw new Error(
            `HTTP error! status: ${response.status} - ${errorText}`
          );
        }

        const result = await response.json();
        console.log("Load test completed successfully:", result);

        // Display results and keep them visible
        displayResults(result);
        showToast("Test completed successfully", "success");

        // Reload past runs after a short delay
        setTimeout(() => loadPastRuns(), 1000);
      } catch (error) {
        console.error("Load test failed:", error);
        showToast(`Test failed: ${error.message}`, "error");
      } finally {
        btn.classList.remove("loading");
        btn.disabled = false;
        stopLiveMonitoring();
      }
    });
}

// Start live monitoring (simulation during actual test)
function startLiveMonitoring() {
  console.log("Starting live monitoring...");

  document.getElementById("testStatus").classList.add("running");
  document.getElementById("liveStatus").classList.add("active");
  document.getElementById("placeholderState").classList.add("hidden");
  document.getElementById("monitoringDashboard").classList.add("active");

  const duration = parseInt(document.getElementById("duration").value);
  const numUsers = parseInt(document.getElementById("numUsers").value);

  // Simulate real-time monitoring during the actual test
  simulateRealtimeData(duration, numUsers);
}

// Stop live monitoring but keep results visible
function stopLiveMonitoring() {
  console.log("Stopping live monitoring...");

  document.getElementById("testStatus").classList.remove("running");
  document.getElementById("liveStatus").classList.remove("active");

  // Don't hide the monitoring dashboard - keep results visible
  // Instead of hiding everything, we'll keep the results displayed
  setTimeout(() => {
    // Only hide the real-time monitoring dashboard, not the results
    document.getElementById("monitoringDashboard").classList.remove("active");
    // Keep results container visible if there are results
    if (
      !document.getElementById("resultsContainer").classList.contains("hidden")
    ) {
      // Results are visible, so don't show placeholder
      console.log("Keeping results visible after test completion");
    } else {
      // No results to show, display placeholder
      document.getElementById("placeholderState").classList.remove("hidden");
    }
  }, 1000); // Shorter delay to keep results visible
}

// Simulate realtime data during actual test execution
function simulateRealtimeData(duration, numUsers) {
  let elapsed = 0;
  const interval = 1000; // Update every second

  console.log(`Starting ${duration}s simulation with ${numUsers} users`);

  const updateInterval = setInterval(() => {
    elapsed += 1;
    const progress = (elapsed / duration) * 100;

    // Update progress bar
    document.getElementById("progressFill").style.width = `${Math.min(
      progress,
      100
    )}%`;

    // Update status text
    document.getElementById(
      "statusText"
    ).textContent = `Testing in progress... (${elapsed}/${duration}s)`;
    document.getElementById(
      "statusDetails"
    ).textContent = `Sending requests with ${numUsers} concurrent users`;

    // Generate mock data that looks realistic
    const baseLatency = 0.2;
    const latencyVariation =
      Math.sin(elapsed * 0.1) * 0.3 + Math.random() * 0.4;
    const latency = baseLatency + latencyVariation;

    const errorRate = Math.random() * 3; // 0-3% error rate
    const activeUserCount = Math.floor(numUsers * (0.8 + Math.random() * 0.2));

    // Update realtime values
    document.getElementById("realtimeLatency").textContent = `${latency.toFixed(
      3
    )}s`;
    document.getElementById(
      "realtimeErrors"
    ).textContent = `${errorRate.toFixed(1)}%`;
    document.getElementById("activeUsers").textContent =
      activeUserCount.toString();
    document.getElementById("statusCodes").textContent =
      errorRate > 2 ? "Mixed" : "2xx";

    // Update charts
    updateRealtimeCharts(latency, errorRate, activeUserCount);

    if (elapsed >= duration) {
      clearInterval(updateInterval);
      console.log("Simulation completed");
    }
  }, interval);
}

// Update realtime charts
function updateRealtimeCharts(latency, errorRate, users) {
  const timestamp = new Date().toLocaleTimeString();

  // Limit data points to prevent memory issues
  const maxPoints = 30;

  // Update latency chart
  if (charts.latency) {
    charts.latency.data.labels.push(timestamp);
    charts.latency.data.datasets[0].data.push(latency * 1000); // Convert to ms

    if (charts.latency.data.labels.length > maxPoints) {
      charts.latency.data.labels.shift();
      charts.latency.data.datasets[0].data.shift();
    }
    charts.latency.update("none");
  }

  // Update error chart
  if (charts.error) {
    charts.error.data.labels.push(timestamp);
    charts.error.data.datasets[0].data.push(errorRate);

    if (charts.error.data.labels.length > maxPoints) {
      charts.error.data.labels.shift();
      charts.error.data.datasets[0].data.shift();
    }
    charts.error.update("none");
  }

  // Update users chart
  if (charts.users) {
    charts.users.data.labels.push(timestamp);
    charts.users.data.datasets[0].data.push(users);

    if (charts.users.data.labels.length > maxPoints) {
      charts.users.data.labels.shift();
      charts.users.data.datasets[0].data.shift();
    }
    charts.users.update("none");
  }

  // Update performance chart
  if (charts.performance) {
    charts.performance.data.labels.push(timestamp);
    charts.performance.data.datasets[0].data.push(latency * 1000);
    charts.performance.data.datasets[1].data.push(errorRate);

    if (charts.performance.data.labels.length > maxPoints) {
      charts.performance.data.labels.shift();
      charts.performance.data.datasets[0].data.shift();
      charts.performance.data.datasets[1].data.shift();
    }
    charts.performance.update("none");
  }
}

// Display real test results from backend and keep them visible
function displayResults(data) {
  console.log("Displaying results:", data);

  // Show the results container and make sure it stays visible
  document.getElementById("resultsContainer").classList.remove("hidden");
  document.getElementById("placeholderState").classList.add("hidden");

  // Update metrics with real data
  document.getElementById("avgLatency").textContent =
    data.avg_latency.toFixed(3);
  document.getElementById("errorRate").textContent =
    (data.error_rate * 100).toFixed(1) + "%";
  document.getElementById("throughput").textContent =
    data.throughput.toFixed(1);
  document.getElementById("totalRequests").textContent = data.total_requests;

  // Update health score with real data
  const healthCircle = document.getElementById("healthCircle");
  const healthScore = document.getElementById("healthScore");
  healthScore.textContent = data.health_score;

  // Update health circle styling based on real score
  healthCircle.className = "health-circle";
  if (data.health_score >= 80) {
    healthCircle.classList.add("excellent");
  } else if (data.health_score >= 60) {
    healthCircle.classList.add("good");
  } else {
    healthCircle.classList.add("poor");
  }

  // Show diagnosis if available
  if (data.diagnosis && data.diagnosis.length > 0) {
    console.log("Diagnosis:", data.diagnosis);
    // You can add diagnosis display here if needed
  }

  console.log("Results displayed and will remain visible");
}

// Load past runs from backend
async function loadPastRuns() {
  console.log("Loading past runs...");

  try {
    const response = await fetch(`${API_BASE}/runs`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const runs = await response.json();
    console.log("Loaded past runs:", runs.length, "runs");

    displayPastRuns(runs);
  } catch (error) {
    console.error("Error loading past runs:", error);
    document.getElementById("pastRunsTable").innerHTML = `
            <tr><td colspan="10" class="empty-state">
                Error loading past runs: ${error.message}
            </td></tr>
        `;
  }
}

// Display past runs in table
function displayPastRuns(runs) {
  const tbody = document.getElementById("pastRunsTable");

  if (runs.length === 0) {
    tbody.innerHTML = `
            <tr><td colspan="10" class="empty-state">
                No past runs found
            </td></tr>
        `;
    return;
  }

  tbody.innerHTML = runs
    .map((run, index) => {
      const status = getHealthStatus(run.health_score);
      const sparklineData = generateSparklineData();

      return `
            <tr onclick="showRunDetails('${run.run_id}')">
                <td>${run.run_id}</td>
                <td>${truncateUrl(run.url)}</td>
                <td>${run.users}</td>
                <td>${run.duration}s</td>
                <td>${run.avg_latency.toFixed(3)}s</td>
                <td>${(run.error_rate * 100).toFixed(1)}%</td>
                <td>${run.throughput.toFixed(1)}</td>
                <td>${run.health_score}</td>
                <td><svg class="sparkline" viewBox="0 0 60 20">${createSparkline(
                  sparklineData
                )}</svg></td>
                <td><span class="status-badge ${status.class}">
                    <span class="status-dot"></span>${status.text}
                </span></td>
            </tr>
        `;
    })
    .join("");
}

// Generate mock sparkline data
function generateSparklineData() {
  return Array.from({ length: 10 }, () => Math.random() * 100);
}

// Create SVG sparkline
function createSparkline(data) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60;
      const y = 20 - ((value - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");

  return `<polyline fill="none" stroke="#fbbf24" stroke-width="1" points="${points}"/>`;
}

// Show run details
function showRunDetails(runId) {
  console.log("Showing details for run:", runId);

  // Find the run data from the current table
  const runs = getCurrentRunsData();
  const run = runs.find((r) => r.run_id === runId);

  if (!run) {
    showToast("Run data not found", "error");
    return;
  }

  // Create and show modal
  createRunDetailsModal(run);
}

// Get current runs data from table
function getCurrentRunsData() {
  const rows = document.querySelectorAll("#pastRunsTable tr");
  const runs = [];

  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const cells = row.querySelectorAll("td");
    if (cells.length >= 8) {
      runs.push({
        run_id: cells[0].textContent,
        url: cells[1].textContent,
        users: parseInt(cells[2].textContent),
        duration: parseInt(cells[3].textContent.replace("s", "")),
        avg_latency: parseFloat(cells[4].textContent.replace("s", "")),
        error_rate: parseFloat(cells[5].textContent.replace("%", "")) / 100,
        throughput: parseFloat(cells[6].textContent),
        health_score: parseInt(cells[7].textContent),
      });
    }
  });

  return runs;
}

// Create and display the run details modal
function createRunDetailsModal(run) {
  // Remove existing modal if any
  const existingModal = document.getElementById("runDetailsModal");
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal HTML
  const modalHtml = `
        <div class="modal-overlay" id="runDetailsModal">
            <div class="modal-content">
                <div class="modal-header">
                    <div class="modal-title">Test Run Details</div>
                    <button class="modal-close" onclick="closeRunDetailsModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="run-summary">
                        <div class="run-summary-header">
                            <div class="run-id">Run ID: ${run.run_id}</div>
                            <div class="run-status ${getHealthStatusClass(
                              run.health_score
                            )}">
                                <span class="status-dot"></span>
                                ${getHealthStatusText(run.health_score)}
                            </div>
                        </div>
                        <div class="run-target">
                            <strong>Target:</strong> ${run.url}
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <div class="modal-section-title">Test Configuration</div>
                        <div class="config-grid">
                            <div class="config-item">
                                <div class="config-label">Concurrent Users</div>
                                <div class="config-value">${run.users}</div>
                            </div>
                            <div class="config-item">
                                <div class="config-label">Duration</div>
                                <div class="config-value">${
                                  run.duration
                                } seconds</div>
                            </div>
                            <div class="config-item">
                                <div class="config-label">HTTP Method</div>
                                <div class="config-value">GET</div>
                            </div>
                            <div class="config-item">
                                <div class="config-label">Total Requests</div>
                                <div class="config-value">${Math.round(
                                  run.throughput * run.duration
                                )}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <div class="modal-section-title">Performance Metrics</div>
                        <div class="metrics-detailed">
                            <div class="metric-row">
                                <div class="metric-icon">⏱️</div>
                                <div class="metric-details">
                                    <div class="metric-name">Average Latency</div>
                                    <div class="metric-value-large">${run.avg_latency.toFixed(
                                      3
                                    )}s</div>
                                </div>
                                <div class="metric-status ${
                                  run.avg_latency < 1
                                    ? "good"
                                    : run.avg_latency < 2
                                    ? "warning"
                                    : "error"
                                }">
                                    ${
                                      run.avg_latency < 1
                                        ? "Excellent"
                                        : run.avg_latency < 2
                                        ? "Good"
                                        : "Poor"
                                    }
                                </div>
                            </div>
                            
                            <div class="metric-row">
                                <div class="metric-icon">⚠️</div>
                                <div class="metric-details">
                                    <div class="metric-name">Error Rate</div>
                                    <div class="metric-value-large">${(
                                      run.error_rate * 100
                                    ).toFixed(1)}%</div>
                                </div>
                                <div class="metric-status ${
                                  run.error_rate < 0.01
                                    ? "good"
                                    : run.error_rate < 0.05
                                    ? "warning"
                                    : "error"
                                }">
                                    ${
                                      run.error_rate < 0.01
                                        ? "Excellent"
                                        : run.error_rate < 0.05
                                        ? "Good"
                                        : "Poor"
                                    }
                                </div>
                            </div>
                            
                            <div class="metric-row">
                                <div class="metric-icon">🚀</div>
                                <div class="metric-details">
                                    <div class="metric-name">Throughput</div>
                                    <div class="metric-value-large">${run.throughput.toFixed(
                                      1
                                    )} req/s</div>
                                </div>
                                <div class="metric-status ${
                                  run.throughput > 50
                                    ? "good"
                                    : run.throughput > 20
                                    ? "warning"
                                    : "error"
                                }">
                                    ${
                                      run.throughput > 50
                                        ? "Excellent"
                                        : run.throughput > 20
                                        ? "Good"
                                        : "Poor"
                                    }
                                </div>
                            </div>
                            
                            <div class="metric-row">
                                <div class="metric-icon">💚</div>
                                <div class="metric-details">
                                    <div class="metric-name">Health Score</div>
                                    <div class="metric-value-large">${
                                      run.health_score
                                    }/100</div>
                                </div>
                                <div class="metric-status ${
                                  run.health_score >= 80
                                    ? "good"
                                    : run.health_score >= 60
                                    ? "warning"
                                    : "error"
                                }">
                                    ${
                                      run.health_score >= 80
                                        ? "Excellent"
                                        : run.health_score >= 60
                                        ? "Good"
                                        : "Poor"
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <div class="modal-section-title">Performance Analysis</div>
                        <div class="analysis-content">
                            ${generateAnalysis(run)}
                        </div>
                    </div>
                    
                    <div class="modal-section">
                        <div class="modal-section-title">Recommendations</div>
                        <div class="recommendations">
                            ${generateRecommendations(run)}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeRunDetailsModal()">Close</button>
                    <button class="btn-primary-small" onclick="exportSingleRun('${
                      run.run_id
                    }')">Export This Run</button>
                </div>
            </div>
        </div>
    `;

  // Add modal to page
  document.body.insertAdjacentHTML("beforeend", modalHtml);

  // Show modal
  setTimeout(() => {
    document.getElementById("runDetailsModal").classList.add("active");
  }, 10);
}

// Generate performance analysis
function generateAnalysis(run) {
  const analysis = [];

  if (run.avg_latency < 0.5) {
    analysis.push(
      "🟢 <strong>Excellent response times</strong> - Your service is performing optimally with sub-500ms latency."
    );
  } else if (run.avg_latency < 1.0) {
    analysis.push(
      "🟡 <strong>Good response times</strong> - Service is performing well within acceptable limits."
    );
  } else if (run.avg_latency < 2.0) {
    analysis.push(
      "🟠 <strong>Moderate latency</strong> - Consider optimizing database queries or caching strategies."
    );
  } else {
    analysis.push(
      "🔴 <strong>High latency detected</strong> - Immediate optimization needed. Check for bottlenecks."
    );
  }

  if (run.error_rate === 0) {
    analysis.push(
      "🟢 <strong>Zero errors</strong> - Perfect reliability during the test period."
    );
  } else if (run.error_rate < 0.01) {
    analysis.push(
      "🟡 <strong>Minimal errors</strong> - Error rate is within acceptable bounds for production."
    );
  } else {
    analysis.push(
      "🔴 <strong>Error rate concerns</strong> - Investigate error patterns and implement better error handling."
    );
  }

  if (run.throughput > 50) {
    analysis.push(
      "🟢 <strong>High throughput</strong> - Service can handle significant load effectively."
    );
  } else if (run.throughput > 20) {
    analysis.push(
      "🟡 <strong>Moderate throughput</strong> - Service performance is acceptable for current load."
    );
  } else {
    analysis.push(
      "🔴 <strong>Low throughput</strong> - Service may struggle under higher load conditions."
    );
  }

  return analysis
    .map((item) => `<div class="analysis-item">${item}</div>`)
    .join("");
}

// Generate recommendations
function generateRecommendations(run) {
  const recommendations = [];

  if (run.avg_latency > 1.0) {
    recommendations.push(
      "⚡ Consider implementing Redis caching for frequently accessed data"
    );
    recommendations.push(
      "🗄️ Optimize database queries and add proper indexing"
    );
    recommendations.push("🌐 Use a CDN for static assets");
  }

  if (run.error_rate > 0.01) {
    recommendations.push(
      "🛡️ Implement circuit breaker patterns for external dependencies"
    );
    recommendations.push("📊 Add comprehensive monitoring and alerting");
    recommendations.push("🔄 Review error handling and retry mechanisms");
  }

  if (run.throughput < 30) {
    recommendations.push("📈 Consider horizontal scaling with load balancers");
    recommendations.push(
      "⚙️ Profile your application for performance bottlenecks"
    );
    recommendations.push("🚀 Implement asynchronous processing where possible");
  }

  if (run.health_score < 80) {
    recommendations.push(
      "🔍 Run chaos engineering tests to identify weaknesses"
    );
    recommendations.push("📝 Review and optimize your service architecture");
    recommendations.push(
      "⚖️ Consider implementing graceful degradation patterns"
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "✅ Your service is performing excellently! Consider stress testing with higher loads."
    );
  }

  return recommendations
    .map((item) => `<div class="recommendation-item">${item}</div>`)
    .join("");
}

// Helper functions
function getHealthStatusClass(score) {
  if (score >= 80) return "status-excellent";
  if (score >= 60) return "status-good";
  return "status-poor";
}

function getHealthStatusText(score) {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Poor";
}

function getHealthStatus(score) {
  if (score >= 80) return { class: "status-excellent", text: "Excellent" };
  if (score >= 60) return { class: "status-good", text: "Good" };
  return { class: "status-poor", text: "Poor" };
}

// Truncate URL for display
function truncateUrl(url) {
  return url.length > 25 ? url.substring(0, 25) + "..." : url;
}

// Export single run (ACTUAL WORKING VERSION)
async function exportSingleRun(runId) {
  console.log("Exporting single run:", runId);

  try {
    const response = await fetch(`${API_BASE}/export/${runId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loadaudit_run_${runId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Single run export completed successfully");
    showToast(`Run ${runId} exported successfully`, "success");

    // Close modal after successful export
    setTimeout(() => closeRunDetailsModal(), 1000);
  } catch (error) {
    console.error("Error exporting single run:", error);
    showToast(`Export failed: ${error.message}`, "error");
  }
}

// Export all results from backend
async function exportResults() {
  console.log("Exporting all results...");

  try {
    const response = await fetch(`${API_BASE}/export`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "load_test_results.csv";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    console.log("Export completed successfully");
    showToast("Results exported successfully", "success");
  } catch (error) {
    console.error("Error exporting results:", error);
    showToast(`Export failed: ${error.message}`, "error");
  }
}

// Close modal
function closeRunDetailsModal() {
  const modal = document.getElementById("runDetailsModal");
  if (modal) {
    modal.classList.remove("active");
    setTimeout(() => modal.remove(), 300);
  }
}

// Show toast notification
function showToast(message, type) {
  console.log("Toast:", type, message);

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.getElementById("toastContainer").appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// Parse JSON safely
function parseJSON(str, defaultValue) {
  if (!str.trim()) return defaultValue;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn("Invalid JSON:", str);
    showToast("Invalid JSON format", "error");
    return defaultValue;
  }
}

// Add event listener to close modal when clicking outside
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("modal-overlay")) {
    closeRunDetailsModal();
  }
});

// Add escape key handler
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeRunDetailsModal();
  }
});