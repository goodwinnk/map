package nk.issues.map

import com.beust.klaxon.*
import com.google.gson.Gson
import org.apache.http.client.methods.HttpGet
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.util.EntityUtils
import java.io.File
import java.io.FileInputStream
import java.util.*

fun main(args: Array<String>) {
    val filter = "Project%3AKT%20%23Unresolved"
    var numberPerRequest = 1000

    var number = -1
    while (number == -1) {
        number = (httpJson(youTrack("/rest/issue/count?filter=$filter")).parseJson() as JsonObject).int("value")!!

        Thread.sleep(100)
    }

    println("Expected: $number")

    val all = LinkedHashSet<IssueOverview>()
    while (all.size < number) {
        val jsonResult = httpJson(youTrack("/rest/issue?filter=$filter&max=$numberPerRequest&after=${all.size}"))

        @Suppress("UNCHECKED_CAST")
        val issues = (jsonResult.parseJson() as JsonObject).array<JsonObject>("issue")!!.map { toIssueOverview(it) }

        all.addAll(issues)

        numberPerRequest = issues.size

        println("Add: ${issues.size} Left: ${number - all.size}")

        Thread.sleep(100)
    }

    val output = File("web/test_data/kt_all_overview.json")
    output.createNewFile()
    output.writeText(Gson().toJson(all.toTypedArray()))
}

fun toIssueOverview(issueObject: JsonObject): IssueOverview {
    val fields = issueObject.array<JsonObject>("field")!!
    val fieldsMap: Map<String, JsonObject> = fields.map {
        it.string("name")!! to it
    }.toMap()

    val id = issueObject.string("id")!!
    val url = "https://youtrack.jetbrains.com/issue/" + id
    val summary = fieldsMap["summary"]!!.string("value")!!
    val priority = fieldsMap["Priority"]?.array<String>("value")?.get(0)
    val priorityColor = fieldsMap["Priority"]?.obj("color")?.string("bg") ?: "#aaffff"
    val state = fieldsMap["State"]!!.array<String>("value")!![0]
    val created = fieldsMap["created"]!!.string("value")!!.toLong()
    val votes = fieldsMap["votes"]!!.string("value")!!.toInt()
    val assignee = fieldsMap["Assignee"]?.array<JsonObject>("value")?.first()?.string("value")
    val subsystems = fieldsMap["Subsystems"]?.array<String>("value")?.toTypedArray() ?: arrayOf()

    return IssueOverview(id, url, summary, priority, priorityColor, state, created, votes, assignee, subsystems)
}

fun String.parseJson() : Any = Parser().parse(this.byteInputStream(charset("UTF-8")))!!

fun parse(path: String) : Any {
    FileInputStream(path).use {
        return Parser().parse(it)!!
    }
}

fun youTrack(path: String) = "https://youtrack.jetbrains.com$path"

fun httpJson(url: String): String {
    HttpClientBuilder.create().build().use { httpClient ->
        val request = HttpGet(url)
        request.addHeader("content-type", "application/json")
        request.addHeader("accept", "application/json")

        val result = httpClient.execute(request)
        return EntityUtils.toString(result.entity, "UTF-8")!!
    }
}