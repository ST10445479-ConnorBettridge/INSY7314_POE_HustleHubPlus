package com.hustlehub.app.api

import com.google.gson.Gson
import androidx.annotation.VisibleForTesting
import com.google.gson.GsonBuilder
import com.hustlehub.app.HustleHubApplication
import com.hustlehub.app.R
import com.hustlehub.app.model.ErrorResponse
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.HttpException
import java.security.KeyStore
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.concurrent.TimeUnit
import javax.net.ssl.SSLContext
import javax.net.ssl.TrustManagerFactory
import javax.net.ssl.X509TrustManager

object ApiClient {

    private const val BASE_URL = "https://10.0.2.2:3443/"

    private val gson: Gson = GsonBuilder().create()

    private fun buildTrustManager(): Pair<javax.net.ssl.SSLSocketFactory, X509TrustManager> {
        val cf = CertificateFactory.getInstance("X.509")
        val cert = HustleHubApplication.appContext.resources
            .openRawResource(R.raw.server_cert)
            .use { cf.generateCertificate(it) as X509Certificate }

        val keyStore = KeyStore.getInstance(KeyStore.getDefaultType())
        keyStore.load(null, null)
        keyStore.setCertificateEntry("hustlehub_backend", cert)

        val tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm())
        tmf.init(keyStore)
        val trustManager = tmf.trustManagers[0] as X509TrustManager

        val sslContext = SSLContext.getInstance("TLS")
        sslContext.init(null, tmf.trustManagers, null)
        return sslContext.socketFactory to trustManager
    }

    private val okHttpClient: OkHttpClient by lazy {
        val (sslSocketFactory, trustManager) = buildTrustManager()
        OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .sslSocketFactory(sslSocketFactory, trustManager)
            .build()
    }

    private val defaultService: ApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create(gson))
            .build()
            .create(ApiService::class.java)
    }

    @Volatile
    private var serviceOverride: ApiService? = null

    /** The live pinned-HTTPS service, unless a test has substituted a fake. */
    val apiService: ApiService
        get() = serviceOverride ?: defaultService

    /**
     * Test hook. Substitutes [service] for the real service so activity tests can
     * exercise success, failure and expiry paths without a running backend.
     * Pass null to restore the real one.
     */
    @VisibleForTesting
    @JvmStatic
    fun setApiServiceForTesting(service: ApiService?) {
        serviceOverride = service
    }

    fun parseErrorMessage(e: Throwable): String {
        return when (e) {
            is HttpException -> {
                try {
                    val body = e.response()?.errorBody()?.string()
                    val error: ErrorResponse? = gson.fromJson(body, ErrorResponse::class.java)
                    error?.message ?: "Request failed (${e.code()})"
                } catch (ex: Exception) {
                    "Request failed (${e.code()})"
                }
            }
            is java.net.ConnectException -> {
                "Cannot reach server. Make sure the backend is running."
            }
            is java.net.UnknownHostException -> {
                "Cannot reach server. Check network connection."
            }
            is javax.net.ssl.SSLException -> {
                "SSL connection failed. Certificate mismatch."
            }
            is java.net.SocketTimeoutException -> {
                "Request timed out. Server may be unreachable."
            }
            else -> e.message ?: "An unexpected error occurred"
        }
    }
}
