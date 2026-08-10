package com.hustlehub.app

import android.app.Application
import android.content.Context

class HustleHubApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        appContext = applicationContext
    }

    companion object {
        lateinit var appContext: Context
    }
}
