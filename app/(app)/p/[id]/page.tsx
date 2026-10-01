// Every link to a person lands in Kontakte.
import { redirect } from 'next/navigation';

export default async function PersonLink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/kontakte?typ=person&id=${id}`);
}
