# data-science

Historical data pipeline and machine-learning work — **planned for Phases 5–6** (see [SRS §7](../docs/SRS.md)).

| Folder | Contents |
|---|---|
| `notebooks/` | Exploratory analysis (Jupyter) |
| `src/` | Reproducible pipeline and training code |
| `tests/` | Pipeline and model tests |
| `models/` | Model metadata only — serialized models and datasets are not committed |

Prediction is gated on data sufficiency (§7.8): models are evaluated on chronologically later data and compared against a simple baseline before any public use.
