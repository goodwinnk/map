package nk.issues.map

class IssueOverview(
        val id: String,
        val url: String,
        val summary: String,
        val priority: String?,
        val priorityColor: String,
        val state: String,
        val created: Long,
        val votes: Int,
        val subsystems: Array<String>) {
    override fun hashCode(): Int = id.hashCode()

    override fun equals(other: Any?): Boolean{
        if (this === other) return true
        if (other?.javaClass != javaClass) return false

        other as IssueOverview

        return id == other.id
    }
}
