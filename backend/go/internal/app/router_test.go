package app

import (
	"encoding/json"
	"net/http/httptest"
	"testing"
)

func TestRuntimeDoesNotAdvertiseUnimplementedBusinessReadiness(t *testing.T) {
	for _, tc := range []struct {
		path   string
		status int
	}{{"/api/v1/health/live", 200}, {"/api/v1/health/ready", 503}, {"/api/v1/catalog/titles", 404}} {
		w := httptest.NewRecorder()
		Handler().ServeHTTP(w, httptest.NewRequest("GET", tc.path, nil))
		if w.Code != tc.status {
			t.Fatalf("%s: %d", tc.path, w.Code)
		}
	}
	w := httptest.NewRecorder()
	Handler().ServeHTTP(w, httptest.NewRequest("GET", "/api/v1/capabilities", nil))
	var payload struct {
		Data Capabilities `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.Data.ContractVersion != "v1" || len(payload.Data.Modules) == 0 {
		t.Fatal("missing capability contract")
	}
	for _, module := range payload.Data.Modules {
		if module.Enabled {
			t.Fatalf("%s incorrectly enabled", module.ID)
		}
	}
}
