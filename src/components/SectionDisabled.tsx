export default function SectionDisabled({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
      <p className="text-4xl mb-4">🚫</p>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{name} is disabled</h2>
      <p className="text-gray-500 text-sm">
        This section has been disabled via the <code className="bg-gray-100 px-1 rounded">DISABLE_SECTIONS</code> environment variable.
      </p>
    </div>
  );
}
