group = "goodwinnk.issues.map"
version = "1.0-SNAPSHOT"

plugins {
    kotlin("jvm") version "2.3.20"
    id("application")
}

application {
    mainClass.set("nk.issues.map.Kt_youtrackKt")
}

kotlin {
    jvmToolchain(25)
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("com.beust:klaxon:5.6")
    implementation("com.google.code.gson:gson:2.14.0")
    implementation("org.apache.httpcomponents:httpclient:4.5.14")
}