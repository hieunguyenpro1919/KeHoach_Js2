import React from "react";
import HeroCarousel from "@/modules/home/components/HeroCarousel";
import ClinicSimpleAbout from "@/modules/home/components/ClinicSimpleAbout";
import ClinicSpecialtiesDirectory from "@/modules/home/components/ClinicSpecialtiesDirectory";
import ClinicSimpleWorkflow from "@/modules/home/components/ClinicSimpleWorkflow";

export default function HomePage() {
  return (
    <div className="space-y-10 sm:space-y-12 pb-8">
      {/* 1. Banner Carousel chính */}
      <HeroCarousel />

      {/* 2. Quy Trình Khám Bệnh Nhanh Chóng 3 Bước (Đem 3 Card lên ngay dưới Carousel) */}
      <ClinicSimpleWorkflow />

      {/* 3. Giới Thiệu Phòng Khám MedSched (Gần gũi, tận tâm, không chờ đợi) */}
      <ClinicSimpleAbout />

      {/* 4. Danh Mục Các Chuyên Khoa Ngoại Trú Thiết Yếu (01 – 06) */}
      <ClinicSpecialtiesDirectory />
    </div>
  );
}
