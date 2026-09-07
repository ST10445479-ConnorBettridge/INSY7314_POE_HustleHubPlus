package com.hustlehub.app

import android.app.Activity
import android.content.Intent

/**
 * Starts [target] as the only activity in the task and finishes the caller.
 *
 * Every move between the signed-out screens (Login, Register) and the signed-in
 * screen (Dashboard) goes through here. Clearing the task means Back can never
 * reveal a screen the user has already left: an authenticated user cannot go
 * back to Login, and a user who has just logged out cannot go back to the
 * Dashboard.
 */
fun Activity.startAsNewRoot(target: Class<out Activity>) {
    val intent = Intent(this, target).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    }
    startActivity(intent)
    finish()
}
