package com.hustlehub.app

import android.content.Intent
import android.os.Looper
import android.widget.Button
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import kotlinx.coroutines.CompletableDeferred
import com.hustlehub.app.security.TokenManager
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

@RunWith(RobolectricTestRunner::class)
class DashboardActivityTest {

    private lateinit var api: FakeApiService
    private lateinit var tokenManager: TokenManager

    @Before
    fun setUp() {
        api = TestEnvironment.install().second
        tokenManager = TokenManager(ApplicationProvider.getApplicationContext())
        tokenManager.saveAuthData(TestData.jwt(), """{"id":1,"name":"Cached User","email":"cached@example.com","role":"client","createdAt":""}""")
    }

    @After
    fun tearDown() = TestEnvironment.tearDown()

    private fun settle() = shadowOf(Looper.getMainLooper()).idle()

    private fun launch() =
        Robolectric.buildActivity(DashboardActivity::class.java).setup().get()

    private fun connectionText(activity: DashboardActivity) =
        activity.findViewById<TextView>(R.id.tvConnection).text.toString()

    @Test
    fun `a successful profile fetch reports connected and shows the server's user`() {
        api.profileResult = { TestData.profileResponse(TestData.user(name = "Server User")) }

        val activity = launch()
        settle()

        assertEquals("Server: Connected", connectionText(activity))
        assertEquals(
            "Server User",
            activity.findViewById<TextView>(R.id.tvName).text.toString()
        )
    }

    @Test
    fun `a server that is down reports unreachable, never connected`() {
        api.profileResult = { throw TestData.serverDown() }

        val activity = launch()
        settle()

        // The old code painted "Server: Connected" in green before the request was
        // made, so a down server was briefly reported as up.
        assertEquals("Server: Unreachable", connectionText(activity))
    }

    @Test
    fun `the status is checking while the request is in flight, not connected`() {
        // The regression this guards: the old code painted green before making the
        // request, so a pending call - or an already-dead server - showed as
        // connected until the failure arrived.
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            TestData.profileResponse()
        }

        val activity = launch()
        settle()

        assertEquals("Server: Checking...", connectionText(activity))

        gate.complete(Unit)
        settle()

        assertEquals("Server: Connected", connectionText(activity))
    }

    @Test
    fun `the status never reads connected while a doomed request is in flight`() {
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            throw TestData.serverDown()
        }

        val activity = launch()
        settle()

        assertNotEquals("Server: Connected", connectionText(activity))

        gate.complete(Unit)
        settle()

        assertEquals("Server: Unreachable", connectionText(activity))
    }

    @Test
    fun `the cached user is shown before the server replies`() {
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            TestData.profileResponse(TestData.user(name = "Server User"))
        }

        val activity = launch()
        settle()

        assertEquals(
            "Cached User",
            activity.findViewById<TextView>(R.id.tvName).text.toString()
        )

        gate.complete(Unit)
        settle()

        assertEquals(
            "Server User",
            activity.findViewById<TextView>(R.id.tvName).text.toString()
        )
    }

    @Test
    fun `a 401 clears the session and returns to login`() {
        api.profileResult = { throw TestData.unauthorised("Invalid or expired token") }

        val activity = launch()
        settle()

        val started = shadowOf(activity).nextStartedActivity
        assertEquals(LoginActivity::class.java.name, started?.component?.className)
        assertTrue((started!!.flags and Intent.FLAG_ACTIVITY_CLEAR_TASK) != 0)
        assertNull("the rejected token must be cleared", tokenManager.getToken())
    }

    @Test
    fun `refresh asks the server again`() {
        api.profileResult = { TestData.profileResponse() }

        val activity = launch()
        settle()
        val afterLaunch = api.profileCalls

        activity.findViewById<Button>(R.id.btnRefresh).performClick()
        settle()

        assertEquals(afterLaunch + 1, api.profileCalls)
        assertEquals("Server: Connected", connectionText(activity))
    }

    @Test
    fun `refresh after the server goes down flips the status to unreachable`() {
        api.profileResult = { TestData.profileResponse() }
        val activity = launch()
        settle()
        assertEquals("Server: Connected", connectionText(activity))

        api.profileResult = { throw TestData.serverDown() }
        activity.findViewById<Button>(R.id.btnRefresh).performClick()
        settle()

        assertEquals("Server: Unreachable", connectionText(activity))
    }

    @Test
    fun `logout clears the session and returns to login`() {
        api.profileResult = { TestData.profileResponse() }

        val activity = launch()
        settle()
        activity.findViewById<Button>(R.id.btnLogout).performClick()
        settle()

        val started = shadowOf(activity).nextStartedActivity
        assertEquals(LoginActivity::class.java.name, started?.component?.className)
        assertTrue((started!!.flags and Intent.FLAG_ACTIVITY_CLEAR_TASK) != 0)
        assertNull(tokenManager.getToken())
    }

    @Test
    fun `no stored token sends the user straight back to login`() {
        tokenManager.clear()

        val activity = launch()
        settle()

        assertEquals(
            LoginActivity::class.java.name,
            shadowOf(activity).nextStartedActivity?.component?.className
        )
    }
}
