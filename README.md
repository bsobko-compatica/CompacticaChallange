
# Compatica Challenge – MVP Solution

This repository demonstrates a **production-style MVP implementation** based on three provided SQLite datasets.  
The goal was not just to visualize the raw data, but to **show how a scalable architecture can be designed, tested, and evolved** using the same technology stack as the company.

---

## 🚀 Tech Stack
- **Backend**: ASP.NET Core 7 (Minimal API, Dapper, SQLite, Swagger)
- **Frontend**: Angular 16 + Leaflet (heatmap visualization, interactive filtering)
- **Persistence**: Multi-tenant SQLite databases (per-project isolation)
- **Testing**:
  - xUnit – Unit & integration tests
  - Playwright – UI smoke tests
- **CI/CD**: GitHub Actions (build, test, coverage artifacts)

---

## 📦 Project Structure
CompaticaChallenge/ # ASP.NET Core API – endpoints, data access
CompaticaChallenge.Tests/ # xUnit tests (unit + integration)
CompaticaChallenge.E2E/ # Playwright smoke tests
.github/workflows/ci.yml # GitHub Actions pipeline

---

## 🗺️ Key Features
- **Data-driven API**
  - Heatmap data points (normalized intensity values)
  - Parcel summaries with status calculation
- **UI Features**
  - Heatmap visualization (Good → Warning → Critical zones)
  - Parcel table with:
    - Status filters (OK / Watch / Error)
    - Sorting (status, date, passes)
    - Inline counters per status
  - PDF Export (detailed technical metrics)
- **Legend & UX polish**
  - Heatmap legend (color scale matches rendering)
  - Consistent top navigation + role badges

---

## ✅ Testing Strategy
- **Unit tests (xUnit)**
  - Focus on calculation logic (compaction index, thresholds)
- **Integration tests**
  - Validate API endpoints via `WebApplicationFactory<Program>`
- **UI smoke tests (Playwright)**
  - Verify critical paths (map render, table filtering, PDF export)
- **Code Coverage**
  - Collected via `coverlet.collector`
  - Published as CI artifacts

---

## 🔄 CI/CD Pipeline
![CI](https://github.com/bsobko-compatica/CompacticaChallange/blob/main/ci.yml/badge.svg)

- Build + restore dependencies
- Run unit + integration + UI smoke tests
- Generate coverage report and store as artifact
- Ready to extend for deployment (Docker/Azure Web App)

---

## 📊 Why this approach
This solution is not only a demo, but a **blueprint for production**:
- **Scalable architecture** – multi-tenant data handling
- **Clear separation of concerns** – API vs UI vs tests
- **Production mindset** – CI, coverage, extensibility
- **Business focus** – end-user friendly UI, exportable technical reports

---

## 📝 Next Steps (Future Improvements)
- ML integration for **compaction quality prediction**
- Mobile-first UI (offline-first support)
- Advanced dashboards (Grafana / PowerBI integration)
- Full CI/CD deployment to Azure with staging environments
- Performance benchmarking on larger datasets

---

## 📚 Documentation
See the ![Wiki](https://github.com/bsobko-compatica/CompacticaChallange/wiki) for:
- Architecture diagrams
- API reference
- Example workflows (supervisor → field engineer)
- Screenshots & demo notes
# CompacticaChallange
