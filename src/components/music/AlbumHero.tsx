"use client";
import { useState } from 'react'
import AlbumCoverModal from '@/components/music/AlbumCoverModal'

export function AlbumHero({ title }: { title: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalImageUrl, setModalImageUrl] = useState('')

  return (
    <>
      <section className="bg-[#282828] p-8 text-white">{title}</section>
      <AlbumCoverModal
        isOpen={isModalOpen}
        imageUrl={modalImageUrl}
        altText="Album cover"
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
