import * as React from 'react';
import {
    Avatar,
    Box, Button,
    Container,
    createTheme,
    CssBaseline,
    TextField,
    ThemeProvider, Typography
} from "@mui/material";
import {CreateNewFolder} from "@mui/icons-material";

const theme = createTheme();

export default function GenerateProjectInput() {
    const handleSubmit = (event: any) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        console.log({
            name: data.get('name'),
            path: data.get('path'),
        });
    };

    return (
        <ThemeProvider theme={theme}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Box
                    sx={{
                        marginTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                        <CreateNewFolder />
                    </Avatar>
                    <Typography component="h1" variant="h5">
                        Generate Project
                    </Typography>
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="name"
                            label="Name"
                            name="name"
                            sx={{input: {textAlign: "center"}}}
                            autoFocus
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            id="path"
                            label="Path"
                            name="path"
                            sx={{input: {textAlign: "center"}}}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 3, mb: 2 }}
                        > generate Project </Button>
                    </Box>
                </Box>
            </Container>
        </ThemeProvider>
    );
}
