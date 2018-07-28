package nk.issues.map

import com.beust.klaxon.*
import com.google.gson.Gson
import org.apache.http.client.methods.HttpGet
import org.apache.http.client.utils.URIBuilder
import org.apache.http.impl.client.HttpClientBuilder
import org.apache.http.util.EntityUtils
import java.io.File
import java.io.FileInputStream
import java.util.*
import java.text.SimpleDateFormat

data class IssuesRequest(
        val name: String,
        val filter: String,
        val isSubsystemFromQuery: (String) -> Boolean,
        val fileName: String = "$name.json"
)

private val requests = listOf(
        IssuesRequest(
                "idea-all",
                "Project: IDEA #Unresolved",
                { true }
        ),
        IssuesRequest(
                "kt-all",
                "Project: KT #Unresolved",
                { true }
        ),
        IssuesRequest(
                "kt-ide",
                "Project: Kotlin #Unresolved Subsystems: {IDE*}",
                { it.startsWith("IDE") }
        ),
        IssuesRequest(
                "kt-tools",
                "Project: Kotlin #Unresolved Subsystems: {Tools*}",
                { it.startsWith("Tools")}
        ),
        IssuesRequest(
                "kt-compiler",
                "Project: KT #Unresolved and (" +
                        "Subsystems: {Backend*} or " +
                        "Subsystems: {Frontend*} or " +
                        "Subsystems: IR or " +
                        "Subsystems: {Language design} " +
                        "Subsystems: {Binary Metadata}" +
                        ")",
                { it.startsWith("Backend") || it.startsWith("Frontend") ||
                        it == "IR" || it == "Language design" || it == "Binary Metadata" }
        ),
        IssuesRequest(
                "kt-other",
                "Project: KT #Unresolved " +
                        "Subsystems: -{Backend*} " +
                        "Subsystems: -{Frontend*} " +
                        "Subsystems: -IR " +
                        "Subsystems: -{Language design} " +
                        "Subsystems: -{IDE*} " +
                        "Subsystems: -{Tools*}" +
                        "Subsystems: -{Binary Metadata}",
                {
                    !(it.startsWith("Backend") || it.startsWith("Frontend") ||
                            it == "IR" || it == "Language design" || it == "Binary Metadata" ||
                            it.startsWith("IDE") || it.startsWith("Tools"))
                }
        ),
        IssuesRequest(
                "kt-docs",
                "Project: KT #Unresolved Subsystems: Docs",
                { it == "Docs" }
        )
)

private const val NUMBER_PER_REQUEST = 2000

fun main(args: Array<String>) {
    val today = Date()
    val dirName = SimpleDateFormat("yyyy.MM.dd").format(today)
    val dir = File("web/data/$dirName")
    dir.mkdir()

    for (request in requests) {
        processRequest(request, dir)
    }
}

fun processRequest(request: IssuesRequest, dir: File) {
    var numberPerRequest = NUMBER_PER_REQUEST

    var number = -1
    val countRequest = URIBuilder(youTrack("/rest/issue/count")).apply {
        addParameter("filter", request.filter)
    }.toString()

    while (number == -1) {
        number = (httpJson(countRequest).parseJson() as JsonObject).int("value")!!

        Thread.sleep(100)
    }

    println("Expected for ${request.name}: $number")

    val all = LinkedHashSet<IssueOverview>()
    while (all.size < number) {
        val issuesRequest = URIBuilder(youTrack("/rest/issue")).apply {
            addParameter("filter", request.filter)
            addParameter("max", numberPerRequest.toString())
            addParameter("after", all.size.toString())
        }.toString()

        val jsonResult = httpJson(issuesRequest)

        @Suppress("UNCHECKED_CAST")
        val issues = (jsonResult.parseJson() as JsonObject)
                .array<JsonObject>("issue")!!
                .map {
                    toIssueOverview(it)
                }

        all.addAll(issues)

        numberPerRequest = issues.size

        println("Add: ${issues.size} Left: ${number - all.size}")
        if (issues.size == 0) {
            break
        }

        Thread.sleep(100)
    }

    val compressedIssues = compress(all, request.isSubsystemFromQuery)

    val output = File(dir, request.fileName)
    output.createNewFile()
    output.writeText(Gson().toJson(compressedIssues))
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
    val subsystems = (fieldsMap["Subsystems"] ?: fieldsMap["Subsystem"])
            ?.array<String>("value")
            ?.toTypedArray()
            ?: arrayOf()

    return IssueOverview(id, url, summary, priority, priorityColor, state, created, votes, assignee, subsystems)
}

fun String.parseJson(): Any = Parser().parse(this.byteInputStream(charset("UTF-8")))!!

fun parse(path: String): Any {
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
