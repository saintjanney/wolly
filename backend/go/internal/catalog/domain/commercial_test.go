package domain

import "testing"

func TestPublishedCommercialPolicy(t *testing.T) {
	for _, tc := range []struct {
		name   string
		policy CommercialPolicy
		valid  bool
	}{
		{"free", CommercialPolicy{Class: Free}, true},
		{"purchase", CommercialPolicy{Class: Paid, Lifetime: true}, true},
		{"subscription", CommercialPolicy{Class: Paid, Subscription: true}, true},
		{"both paid", CommercialPolicy{Class: Paid, Lifetime: true, Subscription: true}, true},
		{"free purchase", CommercialPolicy{Class: Free, Lifetime: true}, false},
		{"free subscription", CommercialPolicy{Class: Free, Subscription: true}, false},
		{"free both", CommercialPolicy{Class: Free, Lifetime: true, Subscription: true}, false},
		{"unconfigured paid", CommercialPolicy{Class: Paid}, false},
		{"unknown", CommercialPolicy{}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.policy.ValidatePublication() == nil; got != tc.valid {
				t.Fatalf("valid=%v want %v", got, tc.valid)
			}
		})
	}
}
