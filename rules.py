"""The Apron 1 practice tables used by the scenario trainer.

Keep the airport tables in one small, readable object so they can be updated when
an instructor supplies a revised chart. The browser receives this object through
/api/rules and never hard-codes the answers.
"""

# This is intentionally data, rather than route logic. Each runway row supplies
# the apron entry/exit taxiway. Gate ranges supply the departure spot.
AIRPORT_RULES = {
    "airport": "CYYC",
    "apron": "Apron 1",
    "title": "Apron 1 movement tables",
    "note": "Practice tables for the CYYC Apron 1 trainer. Verify against current airport publications before operational use.",
    "runways": [
        {"name": "17L", "arrivalTaxiway": "A", "departureTaxiway": "A"},
        {"name": "17R", "arrivalTaxiway": "B", "departureTaxiway": "B"},
        {"name": "35L", "arrivalTaxiway": "C", "departureTaxiway": "C"},
        {"name": "35R", "arrivalTaxiway": "D", "departureTaxiway": "D"},
        {"name": "11", "arrivalTaxiway": "E", "departureTaxiway": "E"},
        {"name": "29", "arrivalTaxiway": "F", "departureTaxiway": "F"},
    ],
    "gateSpots": [
        {"gates": "1–4", "gateNumbers": [1, 2, 3, 4], "spot": "S1"},
        {"gates": "5–8", "gateNumbers": [5, 6, 7, 8], "spot": "S2"},
        {"gates": "9–12", "gateNumbers": [9, 10, 11, 12], "spot": "S3"},
        {"gates": "13–16", "gateNumbers": [13, 14, 15, 16], "spot": "S4"},
        {"gates": "17–20", "gateNumbers": [17, 18, 19, 20], "spot": "S5"},
    ],
    "spots": ["S1", "S2", "S3", "S4", "S5"],
    "taxiways": ["A", "B", "C", "D", "E", "F"],
}
