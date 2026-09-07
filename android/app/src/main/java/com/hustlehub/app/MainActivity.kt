package com.hustlehub.app

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.hustlehub.app.security.TokenManager

class MainActivity : AppCompatActivity() {

    private lateinit var tokenManager: TokenManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tokenManager = TokenManager(this)

        Handler(Looper.getMainLooper()).postDelayed({
            if (tokenManager.isLoggedIn()) {
                startAsNewRoot(DashboardActivity::class.java)
            } else {
                // Drop a token that is present but already past its exp claim, so
                // the Dashboard is never shown on credentials the server will
                // reject a moment later.
                tokenManager.clear()
                startAsNewRoot(LoginActivity::class.java)
            }
        }, SPLASH_DELAY_MS)
    }

    companion object {
        private const val SPLASH_DELAY_MS = 2000L
    }
}
