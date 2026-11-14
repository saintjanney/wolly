package app

import (
	"encoding/json"
	"net/http/httptest"
	"os"
	"strconv"
	"testing"
)

func TestImplementedOperationsAgreeWithOpenAPI(t *testing.T) {
	bytes, err := os.ReadFile("../../../../contracts/openapi/wolly.v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var spec struct {
		Paths map[string]struct {
			Get struct {
				Responses map[string]json.RawMessage `json:"responses"`
			} `json:"get"`
		} `json:"paths"`
	}
	if err = json.Unmarshal(bytes, &spec); err != nil {
		t.Fatal(err)
	}
	for path, op := range spec.Paths {
		w := httptest.NewRecorder()
		Handler().ServeHTTP(w, httptest.NewRequest("GET", "/api/v1"+path, nil))
		if _, ok := op.Get.Responses[strconv.Itoa(w.Code)]; !ok {
			t.Fatalf("%s returned undocumented status %d", path, w.Code)
		}
		var body map[string]json.RawMessage
		if err = json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		key := "data"
		if w.Code >= 400 {
			key = "error"
		}
		if _, ok := body[key]; !ok {
			t.Fatalf("%s lacks %s envelope", path, key)
		}
	}
}
