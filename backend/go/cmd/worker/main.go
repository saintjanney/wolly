// Worker lifecycle entrypoint. Durable job execution is not implemented yet.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	slog.Info("worker process started; no job handlers enabled")
	<-ctx.Done()
	slog.Info("worker stopped")
}
