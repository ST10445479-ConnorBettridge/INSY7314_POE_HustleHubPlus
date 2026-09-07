package com.hustlehub.app

import android.content.SharedPreferences
import androidx.test.core.app.ApplicationProvider
import com.hustlehub.app.security.TokenManager
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

@RunWith(RobolectricTestRunner::class)
class TokenManagerTest {

    private lateinit var prefs: SharedPreferences
    private lateinit var tokenManager: TokenManager

    @Before
    fun setUp() {
        prefs = TestEnvironment.install().first
        tokenManager = TokenManager(ApplicationProvider.getApplicationContext())
    }

    @After
    fun tearDown() = TestEnvironment.tearDown()

    @Test
    fun `no token means not logged in`() {
        assertFalse(tokenManager.isLoggedIn())
    }

    @Test
    fun `a token with a future exp claim is logged in`() {
        tokenManager.saveAuthData(TestData.jwt(secondsFromNow = 3600), "{}")
        assertTrue(tokenManager.isLoggedIn())
    }

    @Test
    fun `a token that was already expired when saved is rejected immediately`() {
        // The old implementation only measured time since the token was stored,
        // so this token was treated as valid and the user reached the Dashboard.
        tokenManager.saveAuthData(TestData.jwt(secondsFromNow = -60), "{}")
        assertFalse(tokenManager.isLoggedIn())
    }

    @Test
    fun `a token with no exp claim falls back to the stored timestamp`() {
        tokenManager.saveAuthData("not.a.jwt", "{}")
        assertTrue(tokenManager.isLoggedIn())
    }

    @Test
    fun `expiryMillis reads the exp claim`() {
        val expiry = tokenManager.expiryMillis(TestData.jwt(secondsFromNow = 600))
        val expected = System.currentTimeMillis() + 600_000L
        assertTrue(expiry != null && Math.abs(expiry - expected) < 5_000L)
    }

    @Test
    fun `expiryMillis returns null for a token that is not a JWT`() {
        assertNull(tokenManager.expiryMillis("garbage"))
        assertNull(tokenManager.expiryMillis(""))
    }

    @Test
    fun `clear removes the token and the cached user`() {
        tokenManager.saveAuthData(TestData.jwt(), """{"name":"Test User"}""")
        tokenManager.clear()
        assertNull(tokenManager.getToken())
        assertNull(tokenManager.getUserJson())
        assertFalse(tokenManager.isLoggedIn())
    }

    @Test
    fun `saveAuthData round-trips the token and user`() {
        val token = TestData.jwt()
        tokenManager.saveAuthData(token, """{"name":"Test User"}""")
        assertEquals(token, tokenManager.getToken())
        assertEquals("""{"name":"Test User"}""", tokenManager.getUserJson())
    }
}
