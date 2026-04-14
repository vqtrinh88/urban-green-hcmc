# Business Requirements Document (BRD): UrbanGreen ESG Dashboard

## 1. Product Vision & Objective
The UrbanGreen Dashboard is an interactive, real-time spatial management system designed for city planners, environmental officers, and ESG analysts. It provides a digital twin of the urban canopy to monitor tree health, calculate ecosystem services (Carbon sequestration, Oxygen production), and mitigate public hazard risks through proactive maintenance.


## 2. UI/UX Layout Architecture
The interface follows a **Macro-to-Micro** spatial layout:
* **Center Stage (60% width):** Interactive geospatial map (2D/3D toggleable).
* **Left Panel (20% width):** Ecosystem Services & Global Metrics (Macro view).
* **Right Panel (20% width):** Operational Data, Weather, and Dynamic Individual Tree Details (Micro view).


## 3. Core Functional Requirements

### 3.1. Center Map Visualizer (2D / 3D)
The core mapping engine (utilizing Mapbox GL JS, Google Maps 3D Photorealistic API, or deck.gl/OpenStreetMap).
* **2D Mode:** * Base map displaying streets, zoning, and building footprints.
    * Trees rendered as vector points (circles). 
    * Color-coded by health status (e.g., Green = Excellent, Yellow = Fair, Red = Critical/At-Risk).
* **3D Mode:** * Topographic base map with 3D building extrusions.
    * Trees rendered as 3D low-poly models or point clouds. 
    * The volume of the 3D tree must scale dynamically based on the tree's recorded **Height** and **Canopy Spread**.
* **Location:**	
	* Along the street from (10.783312953114452, 106.69095678886501) to (10.77601844064777, 106.69888268237159)

### 3.2. Left Panel: Aggregated City/Zone Metrics
This panel displays the total or average calculations for the currently viewed map bounds.
* **Total Tree Inventory:** Raw count of tracked trees.
* **Average Height:** Displayed in meters ($m$).
* **Average DBH (Diameter at Breast Height):** The standard measurement for tree thickness, taken at 1.3 meters above ground. Displayed in centimeters ($cm$).
* **Total Ecosystem Services:**
    * **Above-Ground Biomass (AGB):** Estimated living organic material, displayed in Metric Tons ($t$).
    * **Carbon Sequestration:** Annual $CO_2$ absorbed and lifetime stored $CO_2$ (Metric Tons).
    * **Oxygen Production:** Annual $O_2$ yield.
* **Health Distribution Index:** A donut chart showing the percentage of trees in Excellent, Good, Fair, Poor, and Critical conditions.

### 3.3. Right Panel: Operational & Dynamic Data
* **Environmental Context:**
    * Current Local Time / Date.
    * Live Weather API Integration (Temperature, Wind Speed, AQI - Air Quality Index). High winds should trigger UI warnings for "At-Risk" trees.
* **Hazard & Risk Management:**
    * List of **Priority Action Tree IDs**: Trees flagged for high structural risk or interfering with power lines/buildings.
* **Dynamic Individual Tree View (Triggered on Click):**
    * *Overrides the Hazard List when a specific tree is selected.*

### 3.4. Tree Interaction Details (On-Click Events)
When a user clicks a tree on the map, data is presented in two tiers:

**A. Map Tooltip (Quick Glance):**
* **Asset ID:** Unique alphanumeric identifier (e.g., `TR-8472`).
* **Coordinates:** Latitude / Longitude.
* **Species:** Common Name & Scientific Name (*Italicized*, e.g., Red Maple / *Acer rubrum*).
* **Age:** Estimated years.
* **Height:** In meters.

**B. Right Panel (Deep Scientific & Maintenance Profile):**
* **Biometrics:**
    * Height ($m$)
    * DBH ($cm$)
    * Canopy Spread Area ($m^2$)
    * Crown Dieback (% of dead branches in the canopy)
* **Ecosystem Contribution (Calculated for this specific tree):**
    * AGB (Above-Ground Biomass)
    * $CO_2$ Sequestered
    * $O_2$ Produced
* **Maintenance & Maintenance Schedule:**
    * Health Condition (Excellent to Critical).
    * Risk Assessment Rating (Low, Moderate, High, Extreme - based on structural defects).
    * Last Pruning Date (Canopy reduction/crown thinning).
    * Next Scheduled Pruning / Inspection.


## 4. Scientific Data Models & Algorithms 

To make the dashboard functionally realistic, use these allometric principles for mock-data generation or actual backend calculations.

**Above-Ground Biomass (AGB)**
The AI should calculate biomass based on the standard allometric equation using DBH ($D$) and Wood Density ($\rho$). For a generalized tropical or urban broadleaf tree, it can use:
$$AGB = \rho \cdot \exp(-1.499 + 2.148 \cdot \ln(D) + 0.207 \cdot (\ln(D))^2 - 0.0281 \cdot (\ln(D))^3)$$

**Carbon Storage ($CO_2$)**
Carbon is typically 50% of the tree's total dry biomass. To find the $CO_2$ equivalent stored, you multiply the carbon mass by the molecular weight ratio of $CO_2$ to Carbon (which is 3.67).
$$Carbon = 0.5 \cdot AGB$$
$$CO_2 \text{ Stored} = Carbon \cdot 3.67$$


## 5. Instructions for "Vibe-Coding" with Claude

Claude, act as an expert software engineer and GIS developer. Let's build the "UrbanGreen HCMC Dashboard" using the following tech stack:

* **Node version:** 22
* **Frameworks/Libraries:** Vite + VueJS 3.0 + JavaScript (No Typescript)
* **Map Engine:** Leaflet for interactive map

Attached is the Business Requirements Document (`UrbanGreen_BRD.md`). Please scaffold the main dashboard layout, implement a mock data generator using the scientific formulas provided for AGB and CO2, and build out the interactive map with the Left and Right panel dynamic states as described.

Use the following color palette for styling the dashboard:

* **Font-family:** "Inter", "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
* **Primary color:** `rgb(20, 80, 140)`
* **Secondary color:** `rgb(240, 90, 35)`
* **Positive or healthy color:** `rgb(16, 185, 129)`
* **Failed or error color:** `rgb(239, 68, 68)`
* **Warning color:** `rgb(245, 158, 11)`
* **Primary button:** Warning color for background and Primary color for text
* **Secondary button:** White background and Primary color for text and border

Think hard and carefully when you do your planning, and ask any questions to clarify the product requirements, technical requirements, technical stacks, engineering principles, and hard constraints before writing the code.