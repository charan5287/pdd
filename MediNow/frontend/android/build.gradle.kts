plugins {
    id("com.google.gms.google-services") version "4.4.1" apply false
}

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

subprojects {
    project.evaluationDependsOn(":app")
    // Redirect build output to Flutter's expected location: {flutterProject}/build/{subproject}
    project.layout.buildDirectory.set(
        rootProject.layout.buildDirectory.dir(project.name)
    )
    configurations.all {
        resolutionStrategy {
            force("com.google.android.gms:play-services-base:18.5.0")
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
