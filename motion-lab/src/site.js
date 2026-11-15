// Contact details, in one place. Every page, the footer, the menu and the
// WhatsApp message read them from here, so a number cannot be right on one
// page and wrong on another.
//
// In HTML, write {{site.person.number}}, {{site.person.whatsapp}},
// {{site.person.tel}}, {{site.chatbot.number}}, {{site.chatbot.whatsapp}} or
// {{site.email}}. The build fails on a name that is not here.

const line = (number) => {
  const digits = number.replace(/\D/g, '');
  return { number, whatsapp: `https://wa.me/${digits}`, tel: `tel:+${digits}` };
};

export const site = {
  // The WhatsApp chatbot. Replies are automated.
  chatbot: line('+255 790 942 616'),
  // A person on the team, on WhatsApp and by phone. Briefs and estimates go here.
  person: line('+255 792 867 427'),
  email: 'altrawaretechnology@gmail.com',
};
