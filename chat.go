package main

// Here, we import the required packages (including Pusher)
import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	pusher "github.com/pusher/pusher-http-go"
)

// Here, we register the Pusher client
var client = pusher.Client{
	AppId:   "PUSHER_APP_ID",
	Key:     "PUSHER_APP_KEY",
	Secret:  "PUSHER_APP_SECRET",
	Cluster: "PUSHER_APP_CLUSTER",
	Secure:  true,
}

// Here, we define a user as a struct
type user struct {
	Name  string `json:"name" xml:"name" form:"name" query:"name"`
	Email string `json:"email" xml:"email" form:"email" query:"email"`
}

// -------------------------------------------------------
// Here, we receive a new user's details in a POST request and
// bind it to an instance of the user struct, so that we can trigger
// the received details over to every other user in an event over the public channel.
// -------------------------------------------------------
func registerNewUser(rw http.ResponseWriter, req *http.Request) {
	body, err := ioutil.ReadAll(req.Body)

	if err != nil {
		panic(err)
	}

	var newUser user
	err = json.Unmarshal(body, &newUser)

	if err != nil {
		panic(err)
	}

	client.Trigger("update", "new-user", newUser)

	json.NewEncoder(rw).Encode(newUser)
}

// -------------------------------------------------------
// Here, we authorize users so that they can subscribe to private channels
// -------------------------------------------------------
func pusherAuth(res http.ResponseWriter, req *http.Request) {

	params, _ := ioutil.ReadAll(req.Body)

	response, err := client.AuthenticatePrivateChannel(params)

	if err != nil {
		panic(err)
	}

	fmt.Fprintf(res, string(response))
}

func main() {

	// Serve the static files and templates from the public directory
	http.Handle("/", http.FileServer(http.Dir("./public")))

	// -------------------------------------------------------
	// Listen on these routes for new user registration and user authorization,
	// thereafter, handle each request using the matching handler function.
	// -------------------------------------------------------
	http.HandleFunc("/new/user", registerNewUser)
	http.HandleFunc("/pusher/auth", pusherAuth)

	// Start executing the application on port 8090
	log.Fatal(http.ListenAndServe(":8090", nil))
}
