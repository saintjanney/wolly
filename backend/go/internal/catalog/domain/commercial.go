// Package domain contains catalog rules without transport or persistence imports.
package domain

import "errors"

type CommercialClass string

const (
	Free CommercialClass = "free"
	Paid CommercialClass = "paid"
)

type CommercialPolicy struct {
	Class        CommercialClass
	Lifetime     bool
	Subscription bool
}

// ValidatePublication checks a proposed published policy, not historical grants or drafts.
func (p CommercialPolicy) ValidatePublication() error {
	switch p.Class {
	case Free:
		if p.Lifetime || p.Subscription {
			return errors.New("free content cannot enable paid acquisition")
		}
	case Paid:
		if !p.Lifetime && !p.Subscription {
			return errors.New("paid content requires at least one paid acquisition route")
		}
	default:
		return errors.New("commercial classification is required")
	}
	return nil
}
