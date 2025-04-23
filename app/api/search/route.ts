import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query, numResults = 5 } = await request.json()

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const apiKey = process.env.SERPAPI_KEY || process.env.NEXT_PUBLIC_SERPAPI_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Search service not configured. Please add a SERPAPI_KEY to your environment variables." },
        { status: 500 },
      )
    }

    // Construct the API URL with the query and API key
    const url = new URL("https://serpapi.com/search")
    url.searchParams.append("q", query)
    url.searchParams.append("api_key", apiKey)
    url.searchParams.append("engine", "google")
    url.searchParams.append("num", numResults.toString())
    url.searchParams.append("hl", "en")
    url.searchParams.append("gl", "us")

    // Make the request to the SerpAPI
    const response = await fetch(url.toString(), {
      // Add cache: 'no-store' to prevent caching issues
      cache: "no-store",
      // Add a longer timeout
      signal: AbortSignal.timeout(15000), // 15 seconds timeout
    })

    if (!response.ok) {
      throw new Error(`SerpAPI returned status: ${response.status}`)
    }

    const data = await response.json()

    // Extract and format the search results with additional information
    const results =
      data.organic_results?.map((result: any, index: number) => {
        // Extract domain from URL
        let source = ""
        try {
          const url = new URL(result.link)
          source = url.hostname.replace("www.", "")
        } catch (e) {
          source = "unknown source"
        }

        // Check if it's a video or PDF
        const isVideo =
          result.link.includes("youtube.com") ||
          result.link.includes("vimeo.com") ||
          (result.rich_snippet &&
            result.rich_snippet.top &&
            result.rich_snippet.top.detected_extensions?.includes("video"))

        const isPdf = result.link.toLowerCase().endsWith(".pdf")

        // Extract date if available
        let date = null
        if (result.date) {
          date = result.date
        } else if (
          result.rich_snippet &&
          result.rich_snippet.top &&
          result.rich_snippet.top.detected_extensions?.includes("date")
        ) {
          date = result.rich_snippet.top.detected_extensions.date
        }

        // Extract rating if available
        let rating = null
        if (result.rich_snippet && result.rich_snippet.top && result.rich_snippet.top.extensions) {
          const ratingText = result.rich_snippet.top.extensions.find((ext: string) => ext.includes("★"))
          if (ratingText) {
            const ratingMatch = ratingText.match(/([0-9.]+)\/([0-9.]+)/)
            const ratingCountMatch = ratingText.match(/([0-9,]+) reviews/)
            if (ratingMatch) {
              rating = {
                value: Number.parseFloat(ratingMatch[1]),
                count: ratingCountMatch ? Number.parseInt(ratingCountMatch[1].replace(/,/g, "")) : 0,
              }
            }
          }
        }

        // Extract thumbnail if available
        let thumbnail = null
        if (result.thumbnail) {
          thumbnail = result.thumbnail
        } else if (result.rich_snippet && result.rich_snippet.top && result.rich_snippet.top.img) {
          thumbnail = result.rich_snippet.top.img
        }

        // Extract sitelinks if available
        let sitelinks = null
        if (result.sitelinks && result.sitelinks.inline) {
          sitelinks = result.sitelinks.inline.map((link: any) => ({
            title: link.title,
            link: link.link,
          }))
        }

        return {
          title: result.title,
          link: result.link,
          snippet: result.snippet || "No description available",
          position: index + 1,
          thumbnail: thumbnail,
          source: source,
          date: date,
          isVideo: isVideo,
          isPdf: isPdf,
          rating: rating,
          sitelinks: sitelinks,
        }
      }) || []

    return NextResponse.json({
      query,
      results,
    })
  } catch (error) {
    console.error("Error in search API:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to perform search",
        query: request.body ? (await request.json()).query : "",
      },
      { status: 500 },
    )
  }
}
