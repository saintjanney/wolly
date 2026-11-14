package config

import (
	"fmt"
	"net"
	"os"
)

type Config struct{ Address string }

func Load() (Config, error) {
	address := os.Getenv("WOLLY_HTTP_ADDRESS")
	if address == "" {
		address = "127.0.0.1:8080"
	}
	if _, _, err := net.SplitHostPort(address); err != nil {
		return Config{}, fmt.Errorf("WOLLY_HTTP_ADDRESS: %w", err)
	}
	return Config{Address: address}, nil
}
