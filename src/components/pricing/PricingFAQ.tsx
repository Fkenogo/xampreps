import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const PricingFAQ: React.FC = () => {
  const faqs = [
    {
      question: 'Can I upgrade anytime?',
      answer: 'Yes. You can upgrade at any time. Contact us if you need help managing your subscription.',
    },
    {
      question: 'How do I pay?',
      answer: 'Payment options are shared when you select a plan. Contact us if you have questions about billing.',
    },
    {
      question: 'Can one account be used by multiple students?',
      answer: 'Each student needs their own account for accurate tracking.',
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">❓ Frequently Asked Questions</h3>
      
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, index) => (
          <AccordionItem key={index} value={`item-${index}`}>
            <AccordionTrigger className="text-sm text-left">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default PricingFAQ;