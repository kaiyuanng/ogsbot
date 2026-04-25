// In-memory store — no database needed for MVP
let frame = null;
let prevClusters = [];
let currClusters = [];
let trackedClusters = [];
let lastUpdated = null;

function update(newFrame, newClusters, tracked) {
  prevClusters = currClusters;
  frame = newFrame;
  currClusters = newClusters;
  trackedClusters = tracked;
  lastUpdated = new Date().toISOString();
}

function get() {
  return { frame, prevClusters, currClusters, trackedClusters, lastUpdated };
}

module.exports = { update, get };
