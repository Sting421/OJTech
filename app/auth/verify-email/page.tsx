export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-4">
        <h2 className="text-2xl font-bold">Check your email</h2>
        <p className="text-gray-600">
          We&apos;ve sent you an email with a confirmation link. Please click the link to verify your email address and complete your registration.
        </p>
        <p className="text-sm text-gray-500">
          If you don&apos;t see the email, please check your spam folder.
        </p>
      </div>
    </div>
  );
}
