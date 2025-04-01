import React from "react";
import { Container, Typography, Box, Paper, Divider } from "@mui/material";
import Footer from "../components/Footer";

const Contacts = () => {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Container maxWidth="lg" sx={{ flexGrow: 1, py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
            Контакти
          </Typography>
          <Divider sx={{ my: 3 }} />
          
          <Box sx={{ mb: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Свържете се с нас
            </Typography>
            <Typography paragraph>
              Ще се радваме да чуем от вас! Независимо дали имате въпрос относно нашите услуги, нуждаете се от помощ с профила си или имате предложения, нашият екип е готов да ви помогне.
            </Typography>
            
            <Box sx={{ mt: 4, p: 4, bgcolor: "background.paper", borderRadius: 2, border: "1px solid rgba(0, 255, 170, 0.3)" }}>
              <Typography variant="h6" gutterBottom sx={{ color: "primary.main" }}>
                Поддръжка на клиенти
              </Typography>
              <Typography variant="h5" paragraph sx={{ fontWeight: 600 }}>
                qupbot@gmail.com
              </Typography>
              <Typography color="text.secondary">
                Нашият екип за поддръжка обикновено отговаря в рамките на 24 часа в работни дни.
              </Typography>
            </Box>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Работно време
              </Typography>
              <Typography paragraph>
                <strong>Часове:</strong> Понеделник – Петък, 9:00 – 17:00 ч. източно стандартно време
              </Typography>
              <Typography paragraph>
                <strong>Местоположение:</strong> ул. "Геймърска" 123, град Е-спорт
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ mt: 6 }}>
            <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Често задавани въпроси
            </Typography>
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Как да нулирам паролата си?
              </Typography>
              <Typography paragraph>
                Можете да нулирате паролата си, като кликнете върху връзката "Забравена парола" на страницата за вход или като изпратите имейл до нашия екип за поддръжка на qupbot@gmail.com.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Защитена ли е моята лична информация?
              </Typography>
              <Typography paragraph>
                Да, ние приемаме поверителността и сигурността много сериозно. Вашата лична информация е криптирана и съхранявана сигурно според отрасловите стандарти.
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                Как мога да докладвам за грешка или технически проблем?
              </Typography>
              <Typography paragraph>
                Моля, изпратете имейл на qupbot@gmail.com с подробности за проблема, който изпитвате. Включете екранни снимки, ако е възможно, за да ни помогнете да диагностицираме проблема по-бързо.
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default Contacts; 