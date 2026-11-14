FROM golang:1.26 AS build
WORKDIR /src
COPY go.mod ./
COPY . ./
ARG SERVICE=api
RUN CGO_ENABLED=0 go build -trimpath -o /out/service ./cmd/${SERVICE}
FROM scratch
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /out/service /service
USER 65532:65532
EXPOSE 8080
ENV WOLLY_HTTP_ADDRESS=0.0.0.0:8080
ENTRYPOINT ["/service"]
