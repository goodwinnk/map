package nk.issues.map.server

import spark.Spark.*

fun main(args: Array<String>) {
    val projectDir = System.getProperty("user.dir")
    val staticDir = "/web"
    val path = projectDir + staticDir
    staticFiles.externalLocation(path)

    get("/hello") { req, res -> "Hello World" }
    get("/other") { req, res -> "Other World" }
    get("/stop") { req, res -> stop() }
}
