# **Project Specification: Recruitment Data Intelligence Platform**

## **1\. Project Overview**

**Objective:** Build a comprehensive Data Intelligence Platform for a recruitment agency. This is not merely a static reporting tool but an intelligent system that ingests "flat" activity data from the Bullhorn ATS, applies complex business logic (specifically revenue blending), and utilizes Generative AI to dynamically build and render UI widgets based on natural language queries.

\+3

**Core Philosophy:**

* **Intelligence over Reporting:** Move beyond static "snapshots" to strategic, time-series based insights.  
* **Motivational Engine:** Use leaderboards as a primary driver for team performance.  
  \+1  
* **Conversational Interface:** The primary interaction method should be natural language, where the system understands business intent and constructs the appropriate visualization in real-time.  
  \+2

---

## **2\. Data Architecture & Engineering**

### **2.1 Data Source & Ingestion**

* **Source:** Bullhorn ATS.  
* **Input Format:** The system ingests "flat data" where every activity (sales call, meeting, job order) is an individual object with a unique ID.  
  \+1  
* **Hierarchy:** The platform must respect a strict organizational hierarchy for aggregation:  
  \+1  
  1. **National**  
  2. **Region** (e.g., North Island, South Island)  
  3. **Office** (e.g., Auckland, Wellington)  
  4. **Squad/Team**  
  5. **Individual** (Consultants)  
* **Data Cleaning:** There is a known discrepancy in Bullhorn regarding team structures (Perm/Contract splits) that requires remapping at the root level before ingestion.

### **2.2 The "Submittal Persistence" Architecture**

* **Problem:** "Submittal" is a point-in-time status in the source system. If a candidate moves to "Interview" quickly (e.g., within 4 hours), the "Submittal" status is overwritten, causing data loss for retrospective reporting.  
* **Requirement:** The platform must create a **"shadow" record of truth**.  
  * When the status "Submittal" is detected, the system must create a permanent, immutable record of that event.  
  * This allows the platform to report on the *count* of submittals for a period, even if the current status of that candidate has changed.  
    \+1

### **2.3 Semantic Layer**

* **Requirement:** A translation layer is required to map technical system terms to business language.  
* **Example:** "Strategic Referral" may be tracked via notes in the source but needs to be surfaced as a distinct metric in the platform.  
  \+1

---

## **3\. Business Logic & Transformation Engine**

### **3.1 Revenue Blending (Critical Complexity)**

The platform must normalize performance across two distinct revenue models: **Permanent** (lump sum) and **Contract** (margin/GP per hour).

\+1

* **Logic:** "GP per hour" must be converted into a "Revenue Equivalent" using a specific multiplier (e.g., 1000x) to allow for a single "Total Performance" number.  
* **Hybrid Contribution:** If a user has a Permanent budget but places a Contract role, the system must apply this conversion so the Contract revenue contributes to their Permanent target.

### **3.2 Dynamic Rules Engine**

* **Implementation:** All business rules, multipliers, and conversion logic must be stored in a **Markdown file**.  
* **Accessibility:** These rules must be variables that the AI and system can reference easily, ensuring transparency and ease of update.

### **3.3 Dynamic Target Setting**

* **Requirement:** Targets (e.g., budget markers on a dial) must be **programmatic and dynamic**, not static manual entries.  
* **Context:** Targets differ by user, team, and timeframe (e.g., updated after a salary review or new contract).

---

## **4\. UI Framework & Visualization**

### **4.1 Component Generation & Tech Stack**

* **Requirement:** The AI must not just "configure" a chart; it must **generate the code** for new widgets using a standard React component library (e.g., **ShadCN/UI**, Recharts, or similar).  
* **Dynamic Construction:** The system must be able to "rebuild the widget" entirely based on context. For example, switching a filter from "National" to "Auckland" may require a different visual structure or data query, not just a data filter.  
  \+1

### **4.2 Visualization Types**

* **Chronology/Funnel:** A horizontal flow showing the lifecycle: *Sales Calls \-\> Meetings \-\> Job Orders \-\> Submittals \-\> Interviews \-\> Offers \-\> Placements*.  
  * *Feature:* Overlay conversion rates between these stages (e.g., % of Interviews that become Offers).  
    \+1  
* **Leaderboards:** Essential for weekly/monthly motivation.  
  \+1  
* **Time Series:** Line graphs overlaying bar graphs to show trends (e.g., "Last Quarter" vs. "Current Quarter").  
* **Account Coverage:** Heatmaps showing activity density across Ideal Customer Profiles (ICPs).

### **4.3 Interactivity**

* **Drill-Through:** Clicking a metric (e.g., "6 Meetings") must drill through to the underlying list of customers or data rows.  
  \+1

---

## **5\. AI Integration & Workflow**

### **5.1 Conversational Intelligence**

* **Workflow:**  
  1. **Intent Recognition:** User asks, "Show me how we're tracking on X.".  
  2. **Semantic Analysis:** AI maps the request to the data structure and business language.  
     \+1  
  3. **Proactive Suggestion:** AI suggests a specific visualization (e.g., "I suggest a bar chart with X on the axis").  
  4. **Code Generation:** Upon approval, the AI writes the React/ShadCN code to render that specific widget.  
  5. **Placement:** AI asks the user where on the dashboard to place the new widget.  
     \+1

### **5.2 Context Awareness**

* **Duplicate Detection:** The AI must check if a widget meeting the requirement already exists before building a new one.  
* **Evidence:** The AI should provide "evidence-based snippets" explaining *why* it believes a certain result is true.

---

## **6\. Feasibility & Risk Assessment**

### **🟢 Feasible (High Confidence)**

* **AI Code Generation:** The team is confident in the AI's ability to "reach into the data" and generate the necessary widget code.  
* **Data Access:** The "flat" object-based data structure is standard and ready for transformation.

### **🟠 Risks (Requires Engineering)**

* **Submittal Persistence (High Risk):** The native system does not keep a history of the "Submittal" status. Building the "shadow record" logic is critical; without it, retrospective data will be wrong.  
  \+1  
* **Historical Gaps:** The system likely cannot report on data *prior* to the build date because the "shadow records" for past submittals do not exist.  
* **Data "Dirtyness":** The Office/Team hierarchy in Bullhorn is inaccurate (Perm/Contract split) and requires manual cleanup.

### **🔴 Not Feasible / Out of Scope**

* **Native Submittal Tracking:** Relying on Bullhorn's native "change log" for submittals is confirmed to be impossible as the record does not exist.  
  \+1  
* **Static Dials:** Simple "speedometer" dials are explicitly rejected as they lack the context and dynamic range needed for this platform.  
  \+1

