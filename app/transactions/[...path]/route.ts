import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/auth-server";
import { minioClient, bucketName } from "@/lib/minio";

/**
 * Serves stored transaction attachments through this app's domain.
 *
 * Attachments are stored in MinIO but referenced by a same-origin path
 * like `/transactions/<objectName>` (see `lib/minio.ts`). This route
 * proxies the bytes out of MinIO so the browser never needs to reach the
 * internal MinIO host. Access is restricted to the owner of a transaction
 * that references the requested object.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { path } = await params;
    const objectName = decodeURIComponent(path.join("/"));

    // Only the owner of a transaction with this attachment may fetch it.
    const owned = await prisma.transaction.findFirst({
      where: {
        userId: session.user.id,
        attachmentUrl: { endsWith: objectName },
      },
      select: { id: true },
    });
    if (!owned) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stat = await minioClient
      .statObject(bucketName, objectName)
      .catch(() => null);
    if (!stat) {
      return new NextResponse("Not found", { status: 404 });
    }

    const stream = await minioClient.getObject(bucketName, objectName);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    const contentType =
      stat.metaData?.["content-type"] ||
      stat.metaData?.["Content-Type"] ||
      "application/octet-stream";

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=604800, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    console.error("Error serving attachment:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}