package com.hustlehub.app

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.hustlehub.app.security.TokenManager

class MainActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager
    private val handler = Handler(Looper.getMainLooper())

    // Held so it can be cancelled: a posted callback keeps a reference to the
    // activity, and firing after onDestroy would start a screen from a dead
    // context.
    private val routeAfterSplash = Runnable {
        if (isFinishing || isDestroyed) return@Runnable
        if (tokenManager.isLoggedIn()) {
            startAsNewRoot(DashboardActivity::class.java)
        } else {
            // Drop a token that is present but already past its exp claim, so
            // the Dashboard is never shown on credentials the server will
            // reject a moment later.
            tokenManager.clear()
            startAsNewRoot(LoginActivity::class.java)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tokenManager = TokenManager(this)

        handler.postDelayed(routeAfterSplash, SPLASH_DELAY_MS)
    }

    override fun onDestroy() {
        handler.removeCallbacks(routeAfterSplash)
        super.onDestroy()
    }

    companion object {
        private const val SPLASH_DELAY_MS = 2000L
    }
}
