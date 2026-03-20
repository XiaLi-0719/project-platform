import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations/auth";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体不是有效的 JSON" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return NextResponse.json(
      {
        error: "表单验证未通过",
        fieldErrors,
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const name = parsed.data.name.trim();
  const { password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    return NextResponse.json(
      { error: "该邮箱已被注册", fieldErrors: { email: ["该邮箱已被注册"] } },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        email,
        name,
        password: passwordHash,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "注册失败，请稍后重试" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { ok: true, message: "注册成功，请登录" },
    { status: 201 }
  );
}
