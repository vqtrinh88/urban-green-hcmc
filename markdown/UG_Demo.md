# UrbanGreen HCMC: Application Interaction Script

This document defines the high-fidelity user experience (UX) flow, focusing on the transition from cinematic visualization to granular scientific data.

## Phase 1: The Cinematic "Vibe" Intro (0s - 5s)
**Goal:** Establish the digital twin context of Ho Chi Minh City immediately upon load.

* The application initializes in **3D Mode**. The camera is positioned at a low-angle perspective.
* A programmatic 5-second camera animation (tweening) follows a major urban corridor.
* As the camera moves, small, non-blocking modal popups flicker briefly over trees as they pass the camera’s focal point, displaying snippet data (e.g., `ID: TR-01 | Healthy`).

## Phase 2: Dynamic Scaling & Global Metrics
**Goal:** Maintain a real-time link between the map viewport and the dashboard telemetry.

* As the user pans or zooms, the **Left Panel** must update dynamically.

## Phase 3: LiDAR "Deep Scan" Transition
**Goal:** Transition from a general map to a high-precision arboricultural tool.

* User zooms past a specific threshold (e.g., Zoom Level 19).
* The standard map tiles (2D/3D) cross-fade into a "LiDAR Mode" (dark-themed grid with high-contrast satellite base).
    * **Tree Annotation:** Standard markers are replaced by animated 3D bounding boxes or point-cloud-style renders.
    * **Annotation Data:** Display floating text labels next to tree crowns indicating **Max Height** and **Canopy Width** calculated from the scan.

## Phase 4: Individual Asset Inspection
**Goal:** Final drill-down into specific tree health and ESG impact.

* User clicks a specific tree (bbox or LiDAR asset).
* A modal popup to display: 3D Mesh of selected tree and its measurement metrics