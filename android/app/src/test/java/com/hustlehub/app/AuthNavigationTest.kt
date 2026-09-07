package com.hustlehub.app

import android.content.Intent
import android.os.Looper
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import com.hustlehub.app.security.TokenManager
import java.util.concurrent.TimeUnit
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

/**
 * Covers the routing decisions that decide which screen a user lands on, and
 * whether an authenticated screen can be reached again with the Back button.
 */
@RunWith(RobolectricTestRunner::class)
class AuthNavigationTest {

    private lateinit var api: FakeApiService
    private lateinit var tokenManager: TokenManager

    @Before
    fun setUp() {
        api = TestEnvironment.install().second
        tokenManager = TokenManager(ApplicationProvider.getApplicationContext())
    }

    @After
    fun tearDown() = TestEnvironment.tearDown()

    private fun settle() = shadowOf(Looper.getMainLooper()).idle()

    private fun passSplashDelay() =
        shadowOf(Looper.getMainLooper()).idleFor(2, TimeUnit.SECONDS)

    private fun assertClearsTask(intent: Intent?, target: Class<*>) {
        assertEquals(target.name, intent?.component?.className)
        assertTrue(
            "expected FLAG_ACTIVITY_CLEAR_TASK on the intent to ${target.simpleName}",
            (intent!!.flags and Intent.FLAG_ACTIVITY_CLEAR_TASK) != 0
        )
    }

    // ---------------------------------------------------------------- splash

    @Test
    fun `splash sends a signed-in user to the dashboard`() {
        tokenManager.saveAuthData(TestData.jwt(secondsFromNow = 3600), "{}")

        val activity = Robolectric.buildActivity(MainActivity::class.java).setup().get()
        passSplashDelay()

        assertClearsTask(shadowOf(activity).nextStartedActivity, DashboardActivity::class.java)
    }

    @Test
    fun `splash sends a signed-out user to login`() {
        val activity = Robolectric.buildActivity(MainActivity::class.java).setup().get()
        passSplashDelay()

        assertClearsTask(shadowOf(activity).nextStartedActivity, LoginActivity::class.java)
    }

    @Test
    fun `splash rejects and clears an already-expired token`() {
        tokenManager.saveAuthData(TestData.jwt(secondsFromNow = -60), "{}")

        val activity = Robolectric.buildActivity(MainActivity::class.java).setup().get()
        passSplashDelay()

        assertClearsTask(shadowOf(activity).nextStartedActivity, LoginActivity::class.java)
        assertNull("the expired token should not survive the splash", tokenManager.getToken())
    }

    // ----------------------------------------------------------------- login

    @Test
    fun `a successful login clears the task on the way to the dashboard`() {
        api.loginResult = { TestData.authResponse() }

        val activity = Robolectric.buildActivity(LoginActivity::class.java).setup().get()
        activity.findViewById<EditText>(R.id.etEmail).setText("test@example.com")
        activity.findViewById<EditText>(R.id.etPassword).setText("SecurePass1!")
        activity.findViewById<Button>(R.id.btnLogin).performClick()
        settle()

        assertClearsTask(shadowOf(activity).nextStartedActivity, DashboardActivity::class.java)
        assertTrue(activity.isFinishing)
        assertTrue(tokenManager.isLoggedIn())
    }

    @Test
    fun `a rejected login shows the server message and stays put`() {
        api.loginResult = { throw TestData.unauthorised() }

        val activity = Robolectric.buildActivity(LoginActivity::class.java).setup().get()
        activity.findViewById<EditText>(R.id.etEmail).setText("test@example.com")
        activity.findViewById<EditText>(R.id.etPassword).setText("WrongPass1!")
        activity.findViewById<Button>(R.id.btnLogin).performClick()
        settle()

        val error = activity.findViewById<TextView>(R.id.tvError)
        assertEquals(View.VISIBLE, error.visibility)
        assertEquals("Invalid email or password", error.text.toString())
        assertNull(shadowOf(activity).nextStartedActivity)
        assertFalse(activity.isFinishing)
    }

    @Test
    fun `an invalid email is rejected before any request is made`() {
        val activity = Robolectric.buildActivity(LoginActivity::class.java).setup().get()
        activity.findViewById<EditText>(R.id.etEmail).setText("not-an-email")
        activity.findViewById<EditText>(R.id.etPassword).setText("SecurePass1!")
        activity.findViewById<Button>(R.id.btnLogin).performClick()
        settle()

        assertEquals(
            View.VISIBLE,
            activity.findViewById<TextView>(R.id.tvError).visibility
        )
        assertNull("no login should have been attempted", api.lastLogin)
    }

    @Test
    fun `login can still open the register screen normally`() {
        val activity = Robolectric.buildActivity(LoginActivity::class.java).setup().get()
        activity.findViewById<TextView>(R.id.tvGoRegister).performClick()
        settle()

        val started = shadowOf(activity).nextStartedActivity
        assertEquals(RegisterActivity::class.java.name, started?.component?.className)
        assertFalse("login must stay on the stack behind register", activity.isFinishing)
    }

    // -------------------------------------------------------------- register

    @Test
    fun `a successful registration clears the task on the way to the dashboard`() {
        api.registerResult = { TestData.authResponse() }

        val activity = Robolectric.buildActivity(RegisterActivity::class.java).setup().get()
        activity.findViewById<EditText>(R.id.etName).setText("Test User")
        activity.findViewById<EditText>(R.id.etEmail).setText("test@example.com")
        activity.findViewById<EditText>(R.id.etPassword).setText("SecurePass1!")
        activity.findViewById<EditText>(R.id.etConfirmPassword).setText("SecurePass1!")
        activity.findViewById<Button>(R.id.btnRegister).performClick()
        settle()

        // Without CLEAR_TASK the Login screen stayed underneath the Dashboard and
        // Back returned an authenticated user to it.
        assertClearsTask(shadowOf(activity).nextStartedActivity, DashboardActivity::class.java)
        assertTrue(tokenManager.isLoggedIn())
    }

    @Test
    fun `mismatched passwords are rejected before any request is made`() {
        val activity = Robolectric.buildActivity(RegisterActivity::class.java).setup().get()
        activity.findViewById<EditText>(R.id.etName).setText("Test User")
        activity.findViewById<EditText>(R.id.etEmail).setText("test@example.com")
        activity.findViewById<EditText>(R.id.etPassword).setText("SecurePass1!")
        activity.findViewById<EditText>(R.id.etConfirmPassword).setText("Different1!")
        activity.findViewById<Button>(R.id.btnRegister).performClick()
        settle()

        assertEquals(
            "Passwords do not match",
            activity.findViewById<TextView>(R.id.tvError).text.toString()
        )
        assertNull("no registration should have been attempted", api.lastRegister)
    }

    @Test
    fun `the sign-in link returns to the existing login instead of stacking another`() {
        // Register reached from Login: finishing pops back to the instance that is
        // already on the stack, rather than starting a second LoginActivity.
        val controller = Robolectric.buildActivity(RegisterActivity::class.java).setup()
        val activity = controller.get()
        shadowOf(activity).setIsTaskRoot(false)

        activity.findViewById<TextView>(R.id.tvGoLogin).performClick()
        settle()

        assertNull("no duplicate login screen", shadowOf(activity).nextStartedActivity)
        assertTrue(activity.isFinishing)
    }

    @Test
    fun `the sign-in link starts login when register is the only screen`() {
        val activity = Robolectric.buildActivity(RegisterActivity::class.java).setup().get()
        shadowOf(activity).setIsTaskRoot(true)

        activity.findViewById<TextView>(R.id.tvGoLogin).performClick()
        settle()

        assertClearsTask(shadowOf(activity).nextStartedActivity, LoginActivity::class.java)
    }
}
