package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	"backend/internal/elo"
	"backend/internal/hooks"
	_ "backend/pb_migrations"
)

func main() {
	app := pocketbase.New()

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: false,
	})

	hooks.Register(app)

	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		elo.RegisterRoutes(e)

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
