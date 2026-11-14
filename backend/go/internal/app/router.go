// Package app is the composition root. Only this package wires domain modules together.
package app

import (
	"github.com/saintjanney/wolly/backend/go/internal/platform/httpapi"
	"net/http"
)

type Capability struct {
	ID      string `json:"id"`
	Enabled bool   `json:"enabled"`
}
type Capabilities struct {
	ContractVersion string       `json:"contractVersion"`
	Modules         []Capability `json:"modules"`
}

func Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health/live", func(w http.ResponseWriter, r *http.Request) {
		httpapi.JSON(w, http.StatusOK, map[string]any{"data": map[string]string{"status": "live"}})
	})
	mux.HandleFunc("GET /api/v1/health/ready", func(w http.ResponseWriter, r *http.Request) {
		httpapi.Error(w, http.StatusServiceUnavailable, "not_ready", "Persistence, identity and jobs are not implemented; business traffic is disabled.")
	})
	mux.HandleFunc("GET /api/v1/capabilities", func(w http.ResponseWriter, r *http.Request) {
		modules := []Capability{}
		for _, id := range []string{"accounts", "profiles", "catalog", "rights", "publishing", "media", "reading", "commerce", "subscriptions", "channels", "engagement", "notifications", "finance", "operations"} {
			modules = append(modules, Capability{ID: id, Enabled: false})
		}
		httpapi.JSON(w, http.StatusOK, struct {
			Data Capabilities `json:"data"`
		}{Capabilities{ContractVersion: "v1", Modules: modules}})
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		httpapi.Error(w, http.StatusNotFound, "not_found", "This endpoint is not implemented.")
	})
	return mux
}
