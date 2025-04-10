                              secondary={
                                <>
                                  <Typography
                                    component="span"
                                    variant="body2"
                                    color="text.primary"
                                    sx={{ display: 'block', mb: 1 }}
                                  >
                                    {reply.text}
                                  </Typography>
                                  <Typography
                                    component="span"
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.5 }}
                                  >
                                    {new Date(reply.created_at).toLocaleString()}
                                  </Typography>
                                </>
                              } 