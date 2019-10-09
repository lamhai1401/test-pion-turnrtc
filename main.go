package main

import (
	"fmt"
	"os"
	"net/http"
	"github.com/pion/stun"
	"github.com/gorilla/mux"
)

func testTurn() {
	// Creating a "connection" to STUN server.
	c, err := stun.Dial("udp", "35.247.173.254:3478")
	// c, err := stun.Dial("udp", "stun.l.google.com:19302")
	if err != nil {
		panic(err)
	}
	// Building binding request with random transaction id.
	message := stun.MustBuild(stun.TransactionID, stun.BindingRequest)
	// Sending request to STUN server, waiting for response message.
	if err := c.Do(message, func(res stun.Event) {
		if res.Error != nil {
			panic(res.Error)
		}
		// Decoding XOR-MAPPED-ADDRESS attribute from message.
		var xorAddr stun.XORMappedAddress
		if err := xorAddr.GetFrom(res.Message); err != nil {
			panic(err)
		}
		fmt.Println("your IP is", xorAddr.IP)
	}); err != nil {
		panic(err)
	}
}

func main()  {
	fs := http.FileServer(http.Dir("web/"))
	r := mux.NewRouter()

	// static file
	r.PathPrefix("/").Handler(
		http.StripPrefix(
			"/",
			fs,
		))
	
	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8088"
		}

		// err := http.ListenAndServeTLS(fmt.Sprintf(":%s", port), "server.crt", "server.key", r)
		err := http.ListenAndServe(fmt.Sprintf(":%s", port), r)

		if err != nil {
			fmt.Print(err)
		}
	}()

	// log.Println("Serving at localhost:8000...")
	select {}
}