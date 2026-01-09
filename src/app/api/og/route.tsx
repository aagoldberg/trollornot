import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage: "radial-gradient(circle at 25% 25%, #1e1e24 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1a1a1f 0%, transparent 50%)",
        }}
      >
        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Logo/Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                backgroundColor: "#fff",
                borderRadius: 12,
                marginRight: 20,
              }}
            />
            <span
              style={{
                fontSize: 64,
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.02em",
              }}
            >
              TrollOrNot
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 48,
                fontWeight: 700,
                background: "linear-gradient(to right, #f43f5e, #a855f7)",
                backgroundClip: "text",
                color: "transparent",
                marginBottom: 20,
              }}
            >
              Is this person trolling you?
            </span>
            <span
              style={{
                fontSize: 28,
                color: "#a1a1aa",
                maxWidth: 800,
                textAlign: "center",
              }}
            >
              Paste a conversation or screenshot to detect trolling, bad faith arguments, and engagement bait
            </span>
          </div>

          {/* Verdict badges */}
          <div
            style={{
              display: "flex",
              gap: 20,
              marginTop: 50,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                backgroundColor: "rgba(16, 185, 129, 0.2)",
                borderRadius: 12,
                border: "2px solid #10b981",
              }}
            >
              <span style={{ fontSize: 24, color: "#10b981", fontWeight: 600 }}>
                Genuine
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                backgroundColor: "rgba(245, 158, 11, 0.2)",
                borderRadius: 12,
                border: "2px solid #f59e0b",
              }}
            >
              <span style={{ fontSize: 24, color: "#f59e0b", fontWeight: 600 }}>
                Suspicious
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "12px 24px",
                backgroundColor: "rgba(244, 63, 94, 0.2)",
                borderRadius: 12,
                border: "2px solid #f43f5e",
              }}
            >
              <span style={{ fontSize: 24, color: "#f43f5e", fontWeight: 600 }}>
                Trolling
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
