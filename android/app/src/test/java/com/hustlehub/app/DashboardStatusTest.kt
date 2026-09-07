package com.hustlehub.app

import android.content.ClipboardManager
import android.content.Context
import android.os.Looper
import android.widget.Button
import android.widget.TextView
import androidx.test.core.app.ApplicationProvider
import com.hustlehub.app.security.TokenManager
import kotlinx.coroutines.CompletableDeferred
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.Robolectric
import org.robolectric.RobolectricTestRunner
import org.robolectric.Shadows.shadowOf

/**
 * The dashboard's connection indicator, refresh guarding and clipboard, which
 * have to distinguish "the server did not answer" from "the server answered
 * with a failure".
 */
@RunWith(RobolectricTestRunner::class)
class DashboardStatusTest {

    private lateinit var api: FakeApiService
    private lateinit var tokenManager: TokenManager
    private val token = TestData.jwt()

    @Before
    fun setUp() {
        api = TestEnvironment.install().second
        tokenManager = TokenManager(ApplicationProvider.getApplicationContext())
        tokenManager.saveAuthData(
            token,
            """{"id":1,"name":"Cached User","email":"cached@example.com","role":"client","createdAt":""}"""
        )
    }

    @After
    fun tearDown() = TestEnvironment.tearDown()

    private fun settle() = shadowOf(Looper.getMainLooper()).idle()

    private fun launch() =
        Robolectric.buildActivity(DashboardActivity::class.java).setup().get()

    private fun status(a: DashboardActivity) =
        a.findViewById<TextView>(R.id.tvConnection).text.toString()

    private fun statusColour(a: DashboardActivity) =
        a.findViewById<TextView>(R.id.tvConnection).currentTextColor

    private fun colour(a: DashboardActivity, res: Int) = a.resources.getColor(res, null)

    // ------------------------------------------------- reachable vs failing

    @Test
    fun `a network failure reads unreachable in red and keeps the session`() {
        api.profileResult = { throw TestData.serverDown() }

        val activity = launch()
        settle()

        assertEquals("Server: Unreachable", status(activity))
        assertEquals(colour(activity, R.color.hustlehub_danger), statusColour(activity))
        assertNotNull("a network blip must not sign the user out", tokenManager.getToken())
    }

    @Test
    fun `a 500 reads error, not unreachable - the server did answer`() {
        api.profileResult = { throw TestData.serverError() }

        val activity = launch()
        settle()

        // Previously every failure said "Unreachable", which sent people looking
        // for a network fault when the server was up and returning 500.
        assertEquals("Server: Error", status(activity))
        assertEquals(colour(activity, R.color.hustlehub_danger), statusColour(activity))
        assertNotNull(tokenManager.getToken())
    }

    @Test
    fun `a successful response reads connected in green`() {
        api.profileResult = { TestData.profileResponse() }

        val activity = launch()
        settle()

        assertEquals("Server: Connected", status(activity))
        assertEquals(colour(activity, R.color.hustlehub_success), statusColour(activity))
    }

    @Test
    fun `the in-flight state is amber`() {
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            TestData.profileResponse()
        }

        val activity = launch()
        settle()

        assertEquals(colour(activity, R.color.hustlehub_warning), statusColour(activity))

        gate.complete(Unit)
        settle()
    }

    // ------------------------------------------------------ refresh guarding

    @Test
    fun `refresh is disabled while a request is running and restored after`() {
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            TestData.profileResponse()
        }

        val activity = launch()
        settle()

        val refresh = activity.findViewById<Button>(R.id.btnRefresh)
        assertFalse("refresh must be disabled in flight", refresh.isEnabled)

        gate.complete(Unit)
        settle()

        assertTrue("refresh must come back", refresh.isEnabled)
        assertEquals("Refresh", refresh.text.toString())
    }

    @Test
    fun `repeated refresh taps do not stack overlapping requests`() {
        val gate = CompletableDeferred<Unit>()
        api.profileResult = {
            gate.await()
            TestData.profileResponse()
        }

        val activity = launch()
        settle()
        val duringFirst = api.profileCalls

        val refresh = activity.findViewById<Button>(R.id.btnRefresh)
        repeat(5) { refresh.performClick() }
        settle()

        assertEquals("no extra requests while one is in flight", duringFirst, api.profileCalls)

        gate.complete(Unit)
        settle()

        refresh.performClick()
        settle()
        assertEquals(duringFirst + 1, api.profileCalls)
    }

    // ----------------------------------------------------------- clipboard

    @Test
    fun `copy token puts the whole token on the clipboard, not the preview`() {
        api.profileResult = { TestData.profileResponse() }

        val activity = launch()
        settle()

        val preview = activity.findViewById<TextView>(R.id.tvToken).text.toString()
        activity.findViewById<Button>(R.id.btnCopyToken).performClick()

        val clipboard =
            activity.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val copied = clipboard.primaryClip?.getItemAt(0)?.text?.toString()

        assertEquals(token, copied)
        assertTrue("the on-screen label is truncated", preview.endsWith("..."))
        assertTrue("the clipboard holds more than the label", copied!!.length > preview.length)
    }
}
