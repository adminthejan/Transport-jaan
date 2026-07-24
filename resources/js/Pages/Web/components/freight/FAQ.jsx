import React, { useState } from "react";
import downArrow from "../../assets/freight/downArrow.svg";

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: "How quickly will I get a confirmed booking?",
            answer: "Most bookings are confirmed instantly online. Once your payment is processed, you'll receive your booking reference and e-ticket immediately — no waiting on hold or manual approval."
        },
        {
            question: "Can I change my dates after booking?",
            answer: "Yes. You can cancel a confirmed booking up to the cutoff shown on your booking's cancellation policy and rebook new dates. Refund amounts depend on how close to departure you cancel."
        },
        {
            question: "What payment methods are accepted?",
            answer: "We accept major credit and debit cards as well as local payment options at checkout. All payments are processed securely, and you'll get an instant confirmation once your payment clears."
        },
        {
            question: "Is my booking reference enough, or do I need a printed ticket?",
            answer: "Your booking reference is all you need — just show it on your phone when boarding or picking up. You can also download or email yourself a PDF copy from your booking confirmation page at any time."
        },
        {
            question: "What if I need help during my trip?",
            answer: "Our support team is available 24/7. You can reach us through the contact options on this page, or from your account dashboard, and we'll help with changes, delays, or any other questions."
        },
    ];

    return (
        <div className="h-auto flex flex-col justify-center items-center p-5 xl:px-20 xl:py-20">
            <h1 className="bebas-neue text-[40px] font-[400]">FAQ</h1>
            <p className="text-[14px] font-[14px]/[33px] lg:w-[763px] text-center text-[#00000099]">
                Answers to the questions we hear most often. Can't find what you're looking for?
                Our support team is just a message away.
            </p>

            <div className="pt-10 text-[16px]/[33px] poppins flex flex-col justify-center items-center gap-5">
                {faqs.map((faq, idx) => (
                    <div key={idx}>
                        <div
                            className="xl:w-[1214px] xl:h-[75px] bg-[#0955AC33] rounded-[10px] flex flex-col md:flex-row justify-between items-center p-5 xl:px-20 xl:py-5 cursor-pointer"
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                        >
                            <h1>{faq.question}</h1>
                            <img
                                src={downArrow}
                                className={`size-[10px] transition-transform duration-200 ${openIndex === idx ? 'rotate-180' : ''}`}
                            />
                        </div>
                        {openIndex === idx && (
                            <h1 className="xl:w-[1214px] p-5 xl:px-20 xl:py-2 flex justify-center items-center text-justify">
                                {faq.answer}
                            </h1>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FAQ;
