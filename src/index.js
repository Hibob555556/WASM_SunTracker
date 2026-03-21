let solarChart = null;

Module.onRuntimeInitialized = () => {
  const getSolarElevation = Module.cwrap("get_solar_elevation", "number", [
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
    "number",
  ]);

  const calcElevationBtn = document.getElementById("calc-elevation");
  const calcCurrElevationBtn = document.getElementById("calc-curr-elevation");
  const chartPanel = document.getElementById("chart-panel");
  const elevationPanel = document.getElementById("elevation-panel");

  if (calcElevationBtn) {
    calcElevationBtn.onclick = () => {
      const time = getRealTime();
      const geoData = getGeoData();

      const latitude = geoData[0];
      const longitude = geoData[1];
      const alt = geoData[2];

      const year = time[0];
      const month = time[1];
      const day = time[2];
      const sec = time[5];
      const tzOff = time[6];

      const dataPoints = [];
      const labels = [];

      for (let hour = 0; hour < 24; hour++) {
        for (let min = 0; min < 60; min += 10) {
          const elevation = getSolarElevation(
            latitude,
            longitude,
            year,
            month,
            day,
            hour,
            min,
            sec,
            alt,
            tzOff
          );

          dataPoints.push(elevation);
          labels.push(
            `${hour.toString().padStart(2, "0")}:${min
              .toString()
              .padStart(2, "0")}`
          );
        }
      }

      if (chartPanel) {
        chartPanel.classList.add("visible");
      }

      popChart(dataPoints, labels);
    };
  }

  if (calcCurrElevationBtn) {
    calcCurrElevationBtn.onclick = () => {
      const geoData = getGeoData();

      const latitude = geoData[0];
      const longitude = geoData[1];
      const altitude = geoData[2];

      const time = getRealTime();

      const elevation = getSolarElevation(
        latitude,
        longitude,
        time[0],
        time[1],
        time[2],
        time[3],
        time[4],
        time[5],
        altitude,
        time[6]
      );

      if (elevationPanel) {
        elevationPanel.classList.add("visible");
      }

      setResult(`Solar Elevation: ${Number(elevation).toFixed(2)}°`);
    };
  }
};

function setResult(res) {
  const resContainer = document.getElementById("result");
  if (!resContainer) return;
  resContainer.textContent = res;
}

function popChart(dataPoints, labels) {
  const canvas = document.getElementById("solarChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (solarChart) {
    solarChart.data.labels = labels;
    solarChart.data.datasets[0].data = dataPoints;
    solarChart.update();
    return;
  }

  solarChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Solar Elevation (°)",
          data: dataPoints,
          borderColor: "orange",
          backgroundColor: "rgba(255, 165, 0, 0.2)",
          tension: 0.3,
          fill: true,
          pointRadius: 2,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true },
      },
      scales: {
        x: {
          title: { display: true, text: "Time of Day" },
        },
        y: {
          title: { display: true, text: "Elevation (degrees)" },
          min: -20,
          max: 90,
        },
      },
    },
  });
}

/**
 * Returns:
 * [year, month, day, hour, minute, second, tzOffsetHours]
 */
function getRealTime() {
  const date = new Date();

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  const tzOffset = date.getTimezoneOffset() / 60;

  return [year, month, day, hour, minute, second, tzOffset * -1];
}

function getGeoData() {
  const lat = Number(document.getElementById("latitude")?.value ?? 0);
  const long = Number(document.getElementById("longitude")?.value ?? 0);
  const alt = Number(document.getElementById("altitude")?.value ?? 0);

  return [lat, long, alt];
}