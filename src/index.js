let solarChart = null;

const chartPalette = {
  line: "#7cf0cf",
  fill: "rgba(124, 240, 207, 0.18)",
  grid: "rgba(255, 255, 255, 0.08)",
  ticks: "#d7e4fb",
  label: "#9fb0cb",
  noonLine: "rgba(255, 210, 121, 0.95)",
  noonGlow: "rgba(255, 210, 121, 0.2)",
  sunriseLine: "rgba(255, 160, 122, 0.95)",
  sunriseGlow: "rgba(255, 160, 122, 0.2)",
  sunsetLine: "rgba(120, 174, 255, 0.95)",
  sunsetGlow: "rgba(120, 174, 255, 0.2)",
};

const solarNoonPlugin = {
  id: "solarNoonPlugin",
  afterDatasetsDraw(chart) {
    const noonIndex = chart?.options?.plugins?.solarNoonMarker?.index;
    if (typeof noonIndex !== "number") return;

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;

    const x = xScale.getPixelForValue(noonIndex);
    const top = yScale.top;
    const bottom = yScale.bottom;
    const ctx = chart.ctx;

    ctx.save();

    ctx.strokeStyle = chartPalette.noonGlow;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();

    ctx.strokeStyle = chartPalette.noonLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = chartPalette.noonLine;
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Solar Noon", x, top + 16);

    ctx.restore();
  },
};

const solarTransitionPlugin = {
  id: "solarTransitionPlugin",
  afterDatasetsDraw(chart) {
    const markers = chart?.options?.plugins?.solarTransitionMarkers?.markers;
    if (!Array.isArray(markers) || markers.length === 0) return;

    const xScale = chart.scales.x;
    const yScale = chart.scales.y;
    if (!xScale || !yScale) return;

    const top = yScale.top;
    const bottom = yScale.bottom;
    const ctx = chart.ctx;

    ctx.save();
    ctx.font = '12px "Space Grotesk", sans-serif';
    ctx.textAlign = "center";

    markers.forEach((marker) => {
      const startX = xScale.getPixelForValue(marker.index);
      const endX = xScale.getPixelForValue(marker.index + 1);
      const x = startX + (endX - startX) * marker.offset;

      ctx.strokeStyle = marker.glowColor;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();

      ctx.strokeStyle = marker.lineColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = marker.lineColor;
      ctx.fillText(marker.label, x, top + 16);
    });

    ctx.restore();
  },
};

Chart.register(solarNoonPlugin, solarTransitionPlugin);

Module.onRuntimeInitialized = () => {
  ensureUtcOffsetField();

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

  if (calcElevationBtn) {
    calcElevationBtn.onclick = () => {
      const utcOffset = getUtcOffset();
      const time = getRealTime(utcOffset);
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

      if (isNaN(latitude) || isNaN(longitude) || isNaN(alt)) {
        setChartResult(
          "Please enter valid numeric values for latitude, longitude, and altitude.",
        );
        clearChart();
        return;
      }

      if (isNaN(utcOffset)) {
        setChartResult("UTC offset must be a number between -12 and 14.");
        clearChart();
        return;
      }

      if (latitude < -90 || latitude > 90) {
        setChartResult("Latitude must be between -90 and 90 degrees.");
        return;
      }

      if (longitude < -180 || longitude > 180) {
        setChartResult("Longitude must be between -180 and 180 degrees.");
        return;
      }

      if (alt < -500 || alt > 9000) {
        setChartResult("Altitude must be between -500 and 9000 meters.");
        return;
      }

      if (utcOffset < -12 || utcOffset > 14) {
        setChartResult("UTC offset must be between -12 and 14 hours.");
        clearChart();
        return;
      }

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
            tzOff,
          );

          dataPoints.push(elevation);
          labels.push(
            `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`,
          );
        }
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

      const utcOffset = getUtcOffset();
      const time = getRealTime(utcOffset);

      if (isNaN(latitude) || isNaN(longitude) || isNaN(altitude)) {
        setResult(
          "Please enter valid numeric values for latitude, longitude, and altitude.",
        );
        return;
      }

      if (isNaN(utcOffset)) {
        setResult("UTC offset must be a number between -12 and 14.");
        return;
      }

      if (latitude < -90 || latitude > 90) {
        setResult("Latitude must be between -90 and 90 degrees.");
        return;
      }

      if (longitude < -180 || longitude > 180) {
        setResult("Longitude must be between -180 and 180 degrees.");
        return;
      }

      if (altitude < -500 || altitude > 9000) {
        setResult("Altitude must be between -500 and 9000 meters.");
        return;
      }

      if (utcOffset < -12 || utcOffset > 14) {
        setResult("UTC offset must be between -12 and 14 hours.");
        return;
      }

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
        time[6],
      );

      setResult(`Solar Elevation: ${Number(elevation).toFixed(2)}\u00B0`);
    };
  }
};

function setResult(res) {
  const resContainer = document.getElementById("result");
  if (!resContainer) return;
  resContainer.textContent = res;
}

function setChartResult(res) {
  const resContainer = document.getElementById("chart-status");
  if (!resContainer) return;
  resContainer.textContent = res;
}

function clearChart() {
  const canvas = document.getElementById("solarChart");
  if (!canvas) return;

  canvas.classList.add("is-hidden");

  if (solarChart) {
    solarChart.destroy();
    solarChart = null;
  }
}

function popChart(dataPoints, labels) {
  const canvas = document.getElementById("solarChart");
  const chartStatus = document.getElementById("chart-status");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  if (chartStatus) {
    chartStatus.textContent =
      "Solar elevation graph generated for the current day.";
  }

  canvas.classList.remove("is-hidden");

  const noonIndex = dataPoints.reduce(
    (bestIndex, value, index, values) =>
      value > values[bestIndex] ? index : bestIndex,
    0,
  );
  const transitionMarkers = getSolarTransitionMarkers(dataPoints, labels);

  if (solarChart) {
    solarChart.data.labels = labels;
    solarChart.data.datasets[0].data = dataPoints;
    solarChart.options.plugins.solarNoonMarker.index = noonIndex;
    solarChart.options.plugins.solarTransitionMarkers.markers =
      transitionMarkers;
    solarChart.update();
    return;
  }

  solarChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Solar Elevation (\u00B0)",
          data: dataPoints,
          borderColor: chartPalette.line,
          backgroundColor: chartPalette.fill,
          tension: 0.3,
          fill: true,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        solarNoonMarker: {
          index: noonIndex,
        },
        solarTransitionMarkers: {
          markers: transitionMarkers,
        },
        legend: {
          display: true,
          labels: {
            color: chartPalette.ticks,
            boxWidth: 14,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: "rgba(7, 17, 31, 0.94)",
          borderColor: "rgba(124, 240, 207, 0.25)",
          borderWidth: 1,
          titleColor: "#f3f7ff",
          bodyColor: "#d7e4fb",
          padding: 12,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Time of Day",
            color: chartPalette.label,
          },
          ticks: {
            color: chartPalette.ticks,
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 8,
          },
          grid: {
            color: chartPalette.grid,
          },
        },
        y: {
          title: {
            display: true,
            text: "Elevation (degrees)",
            color: chartPalette.label,
          },
          ticks: {
            color: chartPalette.ticks,
          },
          grid: {
            color: chartPalette.grid,
          },
          min: -20,
          max: 90,
        },
      },
    },
  });
}

function getSolarTransitionMarkers(dataPoints, labels) {
  const markers = [];

  for (let index = 0; index < dataPoints.length - 1; index++) {
    const current = dataPoints[index];
    const next = dataPoints[index + 1];

    if (current === 0) {
      const type = next >= 0 ? "sunrise" : "sunset";
      markers.push(createTransitionMarker(index, 0, labels[index], type));
      continue;
    }

    if ((current < 0 && next > 0) || (current > 0 && next < 0)) {
      const offset = Math.abs(current) / Math.abs(next - current);
      const label = interpolateTimeLabel(labels[index], labels[index + 1], offset);
      const type = current < 0 && next > 0 ? "sunrise" : "sunset";
      markers.push(createTransitionMarker(index, offset, label, type));
    }
  }

  if (markers.length > 2) {
    return [markers[0], markers[markers.length - 1]];
  }

  return markers;
}

function createTransitionMarker(index, offset, timeLabel, type) {
  const isSunrise = type === "sunrise";
  const label = isSunrise ? "Sunrise" : "Sunset";

  return {
    index,
    offset,
    label: `${label} ${timeLabel}`,
    lineColor: isSunrise ? chartPalette.sunriseLine : chartPalette.sunsetLine,
    glowColor: isSunrise ? chartPalette.sunriseGlow : chartPalette.sunsetGlow,
  };
}

function interpolateTimeLabel(startLabel, endLabel, offset) {
  const startMinutes = labelToMinutes(startLabel);
  const endMinutes = labelToMinutes(endLabel);

  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) {
    return startLabel;
  }

  const minutes = Math.round(startMinutes + (endMinutes - startMinutes) * offset);
  const hours = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const mins = (minutes % 60).toString().padStart(2, "0");

  return `${hours}:${mins}`;
}

function labelToMinutes(label) {
  const [hours, minutes] = label.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Returns:
 * [year, month, day, hour, minute, second, tzOffsetHours]
 */
function getRealTime(utcOffsetOverride) {
  const now = new Date();
  const browserOffset = (now.getTimezoneOffset() / 60) * -1;
  const tzOffset =
    Number.isFinite(utcOffsetOverride) ? utcOffsetOverride : browserOffset;
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const date = new Date(utcMs + tzOffset * 60 * 60 * 1000);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();

  return [year, month, day, hour, minute, second, tzOffset];
}

function getGeoData() {
  const lat = Number(
    document.getElementById("latitude")?.value != ""
      ? document.getElementById("latitude")?.value
      : NaN,
  );
  const long = Number(
    document.getElementById("longitude")?.value != ""
      ? document.getElementById("longitude")?.value
      : NaN,
  );
  const alt = Number(
    document.getElementById("altitude")?.value != ""
      ? document.getElementById("altitude")?.value
      : NaN,
  );

  return [lat, long, alt];
}

function getUtcOffset() {
  const utcOffsetField = document.getElementById("utc-offset");
  const browserOffset = (new Date().getTimezoneOffset() / 60) * -1;
  const value = utcOffsetField?.value?.trim() ?? "";

  if (value === "") {
    return browserOffset;
  }

  return Number(value);
}

function ensureUtcOffsetField() {
  if (document.getElementById("utc-offset")) return;

  const altitudeInput = document.getElementById("altitude");
  const calcElevationBtn = document.getElementById("calc-elevation");
  const calcCurrElevationBtn = document.getElementById("calc-curr-elevation");
  if (!altitudeInput && !calcElevationBtn && !calcCurrElevationBtn) return;

  const browserOffset = (new Date().getTimezoneOffset() / 60) * -1;
  const buttonAnchor = calcElevationBtn ?? calcCurrElevationBtn;
  const referenceGroup =
    buttonAnchor?.closest(".actions, .button-row, .button-group, .controls, .field, .form-group, .input-group, .control, label") ??
    buttonAnchor?.parentElement ??
    altitudeInput?.closest(".field, .form-group, .input-group, .control, label") ??
    altitudeInput?.parentElement;
  const wrapperTag = "div";
  const wrapper = document.createElement(wrapperTag);

  if (referenceGroup?.className) {
    wrapper.className = referenceGroup.className;
  }

  const label = document.createElement("label");
  const referenceLabel = referenceGroup?.querySelector?.("label");
  if (referenceLabel?.className) {
    label.className = referenceLabel.className;
  }
  label.setAttribute("for", "utc-offset");
  label.textContent = "UTC Offset";

  const input = document.createElement("input");
  input.id = "utc-offset";
  input.name = "utc-offset";
  input.type = "number";
  input.step = "0.25";
  input.min = "-12";
  input.max = "14";
  input.placeholder = `Browser: ${formatUtcOffset(browserOffset)}`;
  input.setAttribute("aria-label", "UTC Offset");

  if (altitudeInput.className) {
    input.className = altitudeInput.className;
  }

  wrapper.append(label, input);
  referenceGroup?.insertAdjacentElement("beforebegin", wrapper);
}

function formatUtcOffset(offset) {
  return `UTC${offset >= 0 ? "+" : ""}${offset}`;
}
